# OCaml 5.x + Eio 리팩토링 및 개선 이슈 도출 (masc-mcp)

현재 `masc-mcp` (main upstream) 코드베이스를 분석한 결과, 전반적으로 Eio로의 전환은 이루어져 있으나, OCaml 5.x의 철학과 Eio 베스트 프랙티스(Capability-based Security, Message Passing 등)에 어긋나는 안티 패턴들이 다수 발견되었습니다. 

아래는 이를 개선하기 위해 도출된 주요 이슈(Issues) 목록입니다.

---

## Issue 1: 역량 기반 보안(Capability-based Security) 위반 - `Eio_unix.sleep` 제거
**상태**: `lib/board_listener.ml`, `lib/room/room_utils_ops.ml` 등에서 `Eio_unix.sleep` 사용 중.
**문제점**: 
Eio의 철학은 전역 상태에 의존하지 않고 명시적으로 부여받은 권한(Capability, 예: `clock`, `net`)을 통해서만 부수 효과(Side-effect)를 발생시키는 것입니다. `Eio_unix.sleep`은 `clock` 객체 없이 전역 타이머에 접근하여 sleep을 수행하는 안티 패턴(백도어)입니다.
**개선 방안**:
- `Eio_unix.sleep` 호출을 모두 `Eio.Time.sleep clock`으로 교체.
- 이를 위해 해당 함수(및 상위 호출자)에 `~clock` 인자를 명시적으로 전달받도록 시그니처 수정.

## Issue 2: 과도한 전역 상태 및 `Eio.Mutex` 의존 (Message Passing으로의 전환)
**상태**: `lib/` 내에 무려 90개 이상의 `Eio.Mutex.create ()`가 사용되고 있음. (`registry_mutex`, `chdir_mutex`, `pool_mu`, `cache_mu` 등 수많은 전역 상태 락 존재)
**문제점**:
Domain 간 상태 공유를 위해 Mutex가 필요할 수는 있으나, OCaml 5의 다중 에이전트/동시성 모델에서는 **가변 상태(Mutable state + Mutex)의 공유를 최소화하고, `Eio.Stream`을 활용한 메시지 패싱(Message Passing)**으로 통신하는 것이 데드락(Deadlock)과 데이터 레이스를 방지하는 베스트 프랙티스입니다. 
전역 Mutex가 너무 많아 락 경합(Contention)으로 인한 병목 및 예측 불가능한 병렬성 문제가 발생할 수 있습니다.
**개선 방안**:
- 시스템 내의 핵심 액터(Registry, Cache 등)를 독립된 파이버(Actor 패턴)로 분리하고 상태를 캡슐화.
- 외부에서는 Mutex로 직접 상태를 수정하는 대신, `Eio.Stream.t` (채널)를 통해 요청(Request) 메시지를 보내고 결과를 비동기로 응답받는 구조로 점진적 리팩토링.
- 가급적 순수 함수와 불변 데이터 구조(Immutable Record)를 적극 활용.

## Issue 3: 타입 안전한 비동기 에러 처리 - `Eio.Fiber.fork_promise` 도입
**상태**: 대부분의 백그라운드 작업에서 `Eio.Fiber.fork` 안에서 `try ... with Eio.Cancel.Cancelled _ as e -> raise e | exn -> log_error` 패턴을 반복하여 사용 중. (`lib/tool_team_session_step_spawn.ml` 등 60곳 이상)
**문제점**:
단순한 Fire-and-forget 작업이라면 괜찮지만, 여러 비동기 작업을 병렬로 실행하고 그 **결과(또는 에러)**를 메인 루프로 수거해야 하는 로직에서는 예외 로깅에만 의존하면 복구(Recovery)가 어렵고 유실될 위험이 있습니다.
**개선 방안**:
- 결과나 명시적 에러 처리(`Result` 타입)가 필요한 병렬 작업의 경우, `Eio.Fiber.fork` 대신 **`Eio.Fiber.fork_promise`**를 사용.
- 내부 예외를 `Result.Error`로 캡처(Capture)하여 `Promise.await`로 반환받음으로써, 타입 시스템 수준에서 안전하게 에러를 처리하는 패턴(Fail-fast와 우아한 에러 핸들링의 공존) 적용.

## Issue 4: `Unix.sleepf` 및 블로킹 I/O의 안전성 재점검
**상태**: `lib/shutdown.ml` 및 `lib/process/file_lock_eio.ml`에서 `Unix.sleepf` 사용 중.
**진단 및 조치 사항**:
- `process/file_lock_eio.ml`: `Eio_guard.run_in_systhread`로 감싸진 상태에서 `Unix.sleepf`가 호출되고 있어 Eio 도메인을 블로킹하지 않음 (안전함 / 예외적 허용).
- `shutdown.ml`: Eio 도메인이 교착 상태(Deadlock)에 빠졌을 때 강제 종료하기 위해 `Thread.create` 외부 OS 스레드 내에서 `Unix.sleepf`를 사용 중 (의도된 Watchdog 패턴이므로 안전함).
- **개선 방안**: 이들은 의도된 회피(Workaround)로 판명되었으나, 향후 새로 작성되는 코드에서 `Unix.sleep` 계열이 System Thread 밖에서 사용되지 않도록 Lint/CI 차원의 감시 룰 추가 권장.

---

### 요약 및 우선순위 (Action Items)
1. **[High Priority]** Capability 기반 보안 강제: `Eio_unix.sleep` -> `Eio.Time.sleep` 리팩토링.
2. **[Medium Priority]** 동시성/병렬성 결과 수집 패턴 표준화: 결과값을 반환해야 하는 백그라운드 파이버 로직들을 선별하여 `fork_promise` + `Result` 조합으로 안전한 통제망 구축.
3. **[Long-term]** Actor 기반 상태 관리: 과도하게 밀집된 90여 개의 `Eio.Mutex`를 점진적으로 걷어내고 `Eio.Stream` 채널 통신과 불변 데이터 모델로 마이그레이션.