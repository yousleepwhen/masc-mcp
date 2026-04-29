import { drawHeatmap, canvasWidth, canvasHeight } from '../components/activity-heatmap-draw'

interface HeatmapJob {
  matrix: number[][]
  max: number
  dpr: number
}

const workerSelf = self as unknown as {
  postMessage(message: unknown, transfer?: Transferable[]): void
  onmessage: ((ev: MessageEvent<HeatmapJob>) => void) | null
}

workerSelf.onmessage = (event) => {
  const { matrix, max, dpr } = event.data

  const w = canvasWidth()
  const h = canvasHeight()
  const canvas = new OffscreenCanvas(w * dpr, h * dpr)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    workerSelf.postMessage({ bitmap: null })
    return
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  drawHeatmap(ctx, matrix, max)

  const bitmap = canvas.transferToImageBitmap()
  workerSelf.postMessage({ bitmap }, [bitmap])
}
