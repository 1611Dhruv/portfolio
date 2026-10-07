<!--
DRAFT, not published. Anything under posts/ goes live, so this lives in drafts/.
Raw material pulled out of the gallery post on 2026-10-06, to rewrite in my own words.

Assets from the earlier attempt (not great, maybe redo):
  - public/video/flash-forward.mp4, public/video/flash-backward.mp4
  - scripts/flash_viz.py (manim source, needs LaTeX to render)
-->

# MyTorch: FlashAttention and Memory (working title)

### Calculations for GPU nerds

Number of params: 14,752,384 ≈ 14.8 M

- Embedding layer: 256 × 384 = 98,304
- Learned PE: 1024 × 384 = 393,216
- Transformer blocks: 8 × 1,770,240 = 14,161,920
  - Pre-attention RMSNorm: 384
  - Wq Wk Wv Wo: 4 × (384 × 384) = 589,824
  - Pre-FFN RMSNorm: 384
  - SwiGLU FFN: 3 × (384 × 1024) = 1,179,648
- Post-transformer RMSNorm: 384
- Linear unembed: 384 × 256 + 256 (bias) = 98,560

In FP32 the weights take about 59.0 MB (56.3 MiB) on the GPU. Adam tracks additional state (the first and second moments of the gradient), which adds another 118.0 MB (112.5 MiB), so all in all pretty efficient for a small GPU.

### So why did training eat 22 GB?

Weights, grads and Adam state are under 250 MB, yet training sat at nearly 22 GB. The rest is activations. At B = 32 and T = 1024 a single 384-wide activation is 50 MB, and each block keeps about 17 of those plus 4 of the 1024-wide SwiGLU ones alive for backward. That's ~1.4 GB per block, ~11 GB for all 8. No N × N attention matrix in there thanks to FlashAttention, otherwise add another 805 MB per block.

The other ~11 GB is on me. During backward my autograd gives every intermediate tensor a gradient of the same size and never frees it until the step is over, so by the end of backward everything exists twice. PyTorch frees those as soon as they've been passed along. That is the next fix.

### How my FlashAttention works

The annoying part of attention is the score matrix QKᵀ, which is N × N. FlashAttention never builds it. It streams K and V through shared memory in tiles and keeps a running max and a running sum for each query row, so only the N × 64 output ever goes back to GPU memory.

Mine is two kernels with opposite ownership:

- **Forward:** each thread block owns 64 query rows and sweeps across all of K and V.
- **Backward:** each thread block owns 32 key/value rows and sweeps down all of Q.

**Forward**

The trick is the online softmax. When a new tile shows up with a bigger max, everything accumulated so far gets rescaled by e^(m_old − m_new), and the answer comes out exactly as if the whole row had been seen at once. At the end each row writes its output plus one extra float, LSE = m + log(ℓ).

**Backward**

That one float is all backward needs to rebuild the softmax for any tile, so P gets recomputed instead of stored. dK and dV have a single owner and pile up in registers. dQ is shared by every block, so each block atomicAdds its piece. It costs one extra QKᵀ and saves N² floats, which is a great trade.
