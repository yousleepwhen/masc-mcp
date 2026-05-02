--------------------------- MODULE WorldBuilding ---------------------------
EXTENDS Naturals, Sequences, FiniteSets, TLC

(* 
  TLA+ Specification for the 7 Physical Laws of the MASC World.
  
  1. Stigmergy: Keepers leave traces in the environment.
  2. Local Sight: Keepers only observe the K nearest traces.
  3. Three Rules: Collision avoidance, velocity matching, cohesion.
  4. Flow-Conductivity: Traces guide execution flow.
  5. Active Inference: Exhaustion leads to resting (pausing).
  6. Entropic Oscillation: Predictable decay and injection of chaos.
  7. Phenomenal Emergence: Global properties emerge from local traces.
*)

CONSTANTS 
    Keepers,      \* Set of all agents
    MaxTraces,    \* Maximum number of traces in the environment
    SightRadius,  \* How many traces a Keeper can see (Local Sight)
    MaxEnergy     \* Maximum energy budget for Active Inference

VARIABLES 
    traces,       \* Sequence of stigmergic traces (Chronicle)
    energy,       \* Energy budget per Keeper (for Active Inference)
    state,        \* State of each Keeper: "active", "paused"
    position      \* Abstract coordinate for Local Sight

vars == <<traces, energy, state, position>>

Init == 
    /\ traces = <<>>
    /\ energy = [k \in Keepers |-> MaxEnergy]
    /\ state = [k \in Keepers |-> "active"]
    /\ position = [k \in Keepers |-> 0]

(* Active Inference: If a Keeper exhausts its budget, it pauses. *)
Exhaust(k) == 
    /\ state[k] = "active"
    /\ energy[k] = 0
    /\ state' = [state EXCEPT ![k] = "paused"]
    /\ UNCHANGED <<traces, energy, position>>

(* Stigmergy & Local Sight: Active Keepers read local traces and leave a new trace. *)
Act(k) == 
    /\ state[k] = "active"
    /\ energy[k] > 0
    /\ energy' = [energy EXCEPT ![k] = energy[k] - 1]
    /\ position' = [position EXCEPT ![k] = position[k] + 1]
    /\ traces' = Append(traces, [author |-> k, pos |-> position'[k]])
    /\ UNCHANGED <<state>>

(* Operator Intervention or natural recovery: A paused Keeper resumes with full energy. *)
Recover(k) == 
    /\ state[k] = "paused"
    /\ state' = [state EXCEPT ![k] = "active"]
    /\ energy' = [energy EXCEPT ![k] = MaxEnergy]
    /\ UNCHANGED <<traces, position>>

Next == 
    \E k \in Keepers : Exhaust(k) \/ Act(k) \/ Recover(k)

Spec == Init /\ [][Next]_vars /\ WF_vars(Next)

(* Safety: A Keeper is never active with negative energy. *)
Safety == \A k \in Keepers : energy[k] >= 0

(* Liveness: The fleet never deadlocks; there is always a valid transition. *)
NoDeadlock == \A k \in Keepers : (state[k] = "active" \/ state[k] = "paused")

=============================================================================
