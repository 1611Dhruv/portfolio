"""
FlashAttention in MyTorch (src/ops/flash.cu), 3Blue1Brown style.

Forward  : flash<D_HEAD=64, CAUSAL, BM=64, BN=32, T=512>
Backward : helper_di_kernel + flash_back_kernel<T=256, D_H=64, BS=32>

Render:  PATH=<tex bin>:$PATH manim -qh flash_viz.py FlashForward FlashBackward
"""
import math
import random

from manim import *

config.background_color = "#000000"

Q_COL = YELLOW_C
K_COL = BLUE_C
V_COL = TEAL_C
O_COL = GREEN_C
M_COL = GOLD_C
L_COL = PURPLE_B
G_COL = RED_C
MASK = GREY_D

NT = 8  # tiles per side in the schematic


# ---------------------------------------------------------------- helpers
def section(scene, old, text):
    t = Tex(text, font_size=40, color=GREY_A).to_edge(UP, buff=0.35)
    if old is None:
        scene.play(FadeIn(t, shift=DOWN * 0.2), run_time=0.6)
    else:
        scene.play(FadeOut(old, shift=UP * 0.2), FadeIn(t, shift=DOWN * 0.2),
                   run_time=0.6)
    return t


def note(text, ref=None, direction=DOWN, size=30, color=GREY_B):
    t = Tex(text, font_size=size, color=color)
    if ref is not None:
        t.next_to(ref, direction, buff=0.25)
    return t


def heat_tile(size, color, seed, causal_diag=False, sub=4):
    """a size x size tile made of sub x sub cells with varying intensity"""
    rng = random.Random(seed)
    s = size / sub
    cells = VGroup()
    for r in range(sub):
        for c in range(sub):
            masked = causal_diag and c > r
            sq = Square(side_length=s, stroke_width=0)
            if masked:
                sq.set_fill(MASK, opacity=0.25)
            else:
                sq.set_fill(color, opacity=0.25 + 0.7 * rng.random())
            sq.move_to([(c - (sub - 1) / 2) * s, ((sub - 1) / 2 - r) * s, 0])
            cells.add(sq)
    return cells


class TileGrid(VGroup):
    def __init__(self, n=NT, size=0.5, **kw):
        super().__init__(**kw)
        self.n, self.size = n, size
        self.cells = VGroup(*[
            Square(side_length=size, stroke_color=GREY_D, stroke_width=1,
                   fill_opacity=0)
            for _ in range(n * n)
        ]).arrange_in_grid(rows=n, cols=n, buff=0)
        self.add(self.cells)

    def at(self, i, j):
        return self.cells[i * self.n + j]

    def row_band(self, i, color, op=0.18):
        r = SurroundingRectangle(VGroup(*[self.at(i, j) for j in range(self.n)]),
                                 buff=0, color=color, stroke_width=3)
        return r.set_fill(color, opacity=op)

    def col_band(self, j, color, op=0.18):
        r = SurroundingRectangle(VGroup(*[self.at(i, j) for i in range(self.n)]),
                                 buff=0, color=color, stroke_width=3)
        return r.set_fill(color, opacity=op)


def segmented_bar(n, w, h, color, vertical=True):
    segs = VGroup(*[
        Rectangle(width=w if vertical else h / n,
                  height=h / n if vertical else w,
                  stroke_color=color, stroke_width=1.5,
                  fill_color=color, fill_opacity=0.15)
        for _ in range(n)
    ])
    segs.arrange(DOWN if vertical else RIGHT, buff=0)
    return segs


# ================================================================ FORWARD
class FlashForward(Scene):
    def construct(self):
        self.problem()
        self.tiles()
        self.online_softmax()
        self.warp()
        self.outro()

    # ------------------------------------------------------------ 1
    def problem(self):
        eq = MathTex(r"O", r"=", r"\mathrm{softmax}\!\left(", r"\frac{Q K^{\top}}{\sqrt{d}}",
                     r"\right)", r"V", font_size=60)
        eq[0].set_color(O_COL)
        eq[3].set_color(WHITE)
        eq[5].set_color(V_COL)
        self.play(Write(eq), run_time=1.5)
        self.wait(0.6)
        self.play(eq.animate.scale(0.6).to_edge(UP, buff=0.4), run_time=0.8)

        q = Rectangle(width=0.5, height=4, color=Q_COL, fill_opacity=0.25)
        kt = Rectangle(width=4, height=0.5, color=K_COL, fill_opacity=0.25)
        s = Square(side_length=4, color=WHITE, stroke_width=2)
        q.move_to([-2.6, -0.5, 0])
        s.move_to([0, -0.5, 0])
        kt.next_to(s, UP, buff=0.15)
        q.next_to(s, LEFT, buff=0.15)
        ql = MathTex("Q", color=Q_COL).next_to(q, LEFT)
        kl = MathTex("K^{\\top}", color=K_COL).next_to(kt, RIGHT)
        self.play(FadeIn(q), FadeIn(kt), Write(ql), Write(kl), run_time=0.8)

        heat = heat_tile(4, WHITE, 7, sub=16).move_to(s)
        self.play(GrowFromCenter(heat), Create(s), run_time=1.0)
        br = Brace(s, RIGHT)
        bl = br.get_tex(r"N \times N").set_color(WHITE)
        self.play(GrowFromCenter(br), Write(bl), run_time=0.6)
        cnt = MathTex(r"N = 1024 \;\Rightarrow\; 10^6 \text{ scores per head}",
                      font_size=34).next_to(s, DOWN, buff=0.3)
        self.play(Write(cnt), run_time=0.8)
        self.wait(1.0)

        cross = Cross(s, stroke_color=G_COL, stroke_width=6)
        never = Tex("never stored", color=G_COL, font_size=40).next_to(br, RIGHT)
        self.play(Create(cross), FadeOut(bl), run_time=0.6)
        self.play(Write(never), FadeOut(heat), run_time=0.6)
        self.wait(1.0)
        self.play(*[FadeOut(m) for m in self.mobjects], run_time=0.6)

    # ------------------------------------------------------------ 2
    def tiles(self):
        title = section(self, None, "Only ever look at one tile")
        g = TileGrid(size=0.5).move_to([-1.2, -0.45, 0])
        q = segmented_bar(NT, 0.3, 4, Q_COL).next_to(g, LEFT, buff=0.15)
        kt = segmented_bar(NT, 0.3, 4, K_COL, vertical=False).next_to(g, UP, buff=0.15)
        ql = MathTex("Q", color=Q_COL).next_to(q, LEFT)
        kl = MathTex("K^{\\top},\\,V", color=K_COL).next_to(kt, RIGHT)
        self.play(Create(g), FadeIn(q), FadeIn(kt), Write(ql), Write(kl),
                  run_time=1.0)

        i = 5
        band = g.row_band(i, Q_COL)
        self.play(FadeIn(band), q[i].animate.set_fill(Q_COL, opacity=0.9),
                  run_time=0.6)
        t1 = Tex(r"one thread block\\owns ", r"64", r" query rows",
                 font_size=32).move_to([4.2, 1.4, 0])
        t1[1].set_color(Q_COL)
        t2 = Tex(r"and walks across K/V\\in tiles of ", r"32", r" keys",
                 font_size=32).next_to(t1, DOWN, buff=0.4)
        t2[1].set_color(K_COL)
        self.play(Write(t1), run_time=0.8)
        self.play(Write(t2), run_time=0.8)

        tags = VGroup()
        prev = None
        for j in range(NT):
            cell = g.at(i, j)
            if j < i:
                tile = heat_tile(0.5, WHITE, 100 + j).move_to(cell)
            elif j == i:
                tile = heat_tile(0.5, WHITE, 100 + j, causal_diag=True).move_to(cell)
            else:
                tile = Square(side_length=0.5, stroke_width=0).set_fill(MASK, 0.4).move_to(cell)
            anims = [FadeIn(tile), kt[j].animate.set_fill(K_COL, opacity=0.9)]
            if prev is not None:
                anims += [prev[0].animate.set_opacity(0.0),
                          kt[j - 1].animate.set_fill(K_COL, opacity=0.15)]
            self.play(*anims, run_time=0.35 if j else 0.5)
            prev = (tile,)
            tags.add(tile)
            if j == i:
                d = Tex(r"diagonal tile: keep $k \le q$", font_size=30,
                        color=GREY_A).next_to(t2, DOWN, buff=0.5)
                self.play(Write(d), run_time=0.6)
                self.wait(0.4)
            if j == NT - 1:
                m = Tex(r"future tiles: fully masked\\(still visited)",
                        font_size=30, color=GREY_B).next_to(d, DOWN, buff=0.3)
                self.play(Write(m), run_time=0.6)
        self.wait(0.8)

        idea = Tex(r"Problem: softmax needs the max and sum\\of the \emph{whole} row.",
                   font_size=34).to_edge(DOWN, buff=0.3)
        self.play(Write(idea), run_time=1.0)
        self.wait(1.2)
        self.play(*[FadeOut(m) for m in self.mobjects], run_time=0.6)

    # ------------------------------------------------------------ 3
    def online_softmax(self):
        title = section(self, None, "Online softmax: one row, tile by tile")
        scores = [1.0, 0.3, 2.2, 0.8, 3.1, 1.4, 0.5, 2.6]
        H, base_y, dx = 2.1, -2.0, 1.0
        xs = [(-3.5 + k) * dx - 0.8 for k in range(8)]
        axis = Line([xs[0] - 0.6, base_y, 0], [xs[-1] + 0.6, base_y, 0],
                    color=GREY_C)
        self.play(Create(axis), run_time=0.5)

        # tile brackets + score labels
        brackets = VGroup()
        for t in range(4):
            a, b = xs[2 * t] - 0.4, xs[2 * t + 1] + 0.4
            br = BraceBetweenPoints([a, base_y - 0.65, 0], [b, base_y - 0.65, 0],
                                    direction=DOWN, color=GREY_C)
            lab = Tex(f"tile {t + 1}", font_size=24, color=GREY_B).next_to(br, DOWN, 0.08)
            brackets.add(VGroup(br, lab))
        slabs = VGroup(*[
            MathTex(f"{s:.1f}", font_size=30, color=WHITE).move_to([x, base_y - 0.3, 0])
            for s, x in zip(scores, xs)
        ])
        slab_t = Tex("scores $s_j$", font_size=26, color=GREY_B).next_to(
            slabs, LEFT, buff=0.35)

        # state panel
        m_tr = DecimalNumber(0, num_decimal_places=1, font_size=40, color=M_COL)
        l_tr = DecimalNumber(0, num_decimal_places=3, font_size=40, color=L_COL)
        m_lab = MathTex("m =", font_size=40, color=M_COL)
        l_lab = MathTex(r"\ell =", font_size=40, color=L_COL)
        m_row = VGroup(m_lab, m_tr).arrange(RIGHT, buff=0.15)
        l_row = VGroup(l_lab, l_tr).arrange(RIGHT, buff=0.15)
        state = VGroup(m_row, l_row).arrange(DOWN, aligned_edge=LEFT, buff=0.25)
        state.move_to([5.2, 1.9, 0])
        m_tr.set_value(float("nan"))
        m_ninf = MathTex(r"-\infty", font_size=40, color=M_COL).move_to(m_tr, LEFT)
        m_tr.set_opacity(0)

        eq1 = MathTex(r"m_{\text{new}}", r"=", r"\max(", r"m", r",\ \max_{j \in \text{tile}} s_j)",
                      font_size=34)
        eq1[0].set_color(M_COL); eq1[3].set_color(M_COL)
        eq2 = MathTex(r"\ell", r"\leftarrow", r"\ell", r"\, e^{m - m_{\text{new}}}",
                      r"+ \sum_{j \in \text{tile}} e^{s_j - m_{\text{new}}}",
                      font_size=34)
        eq2[0].set_color(L_COL); eq2[2].set_color(L_COL); eq2[3].set_color(M_COL)
        eqs = VGroup(eq1, eq2).arrange(DOWN, aligned_edge=LEFT, buff=0.2)
        eqs.move_to([-1.6, 2.1, 0])

        bar_t = Tex(r"bar height $= e^{s_j - m}$", font_size=26,
                    color=GREY_B).move_to([5.2, 0.6, 0])

        self.play(Write(eqs), FadeIn(m_lab), FadeIn(m_ninf), FadeIn(l_row),
                  FadeIn(slab_t), FadeIn(bar_t), run_time=1.4)

        bars = [None] * 8
        m = -math.inf
        ell = 0.0

        def bar(k, mval):
            h = H * math.exp(scores[k] - mval)
            r = Rectangle(width=0.6, height=max(h, 0.001), stroke_width=1.5,
                          stroke_color=WHITE, fill_color=Q_COL, fill_opacity=0.7)
            r.move_to([xs[k], base_y + h / 2, 0])
            return r

        first_number = True
        for t in range(4):
            ks = [2 * t, 2 * t + 1]
            self.play(FadeIn(brackets[t]),
                      *[FadeIn(slabs[k], shift=UP * 0.2) for k in ks], run_time=0.5)
            m_tile = max(scores[k] for k in ks)
            m_new = max(m, m_tile)
            anims = []
            if m_new > m and t > 0:
                # the 3b1b moment: everything seen so far shrinks
                fac = math.exp(m - m_new)
                warn = Tex(r"new max! old bars shrink by $e^{m - m_{\text{new}}}$",
                           font_size=30, color=M_COL).move_to([-0.4, 0.75, 0])
                self.play(Indicate(eq1, color=M_COL, scale_factor=1.05),
                          FadeIn(warn), run_time=0.6)
                shrink = [Transform(bars[k], bar(k, m_new)) for k in range(2 * t)]
                self.play(*shrink, m_tr.animate.set_value(m_new),
                          l_tr.animate.set_value(ell * fac), run_time=1.2)
                ell *= fac
                self.play(FadeOut(warn), run_time=0.3)
            elif t == 0:
                self.play(FadeOut(m_ninf), m_tr.animate.set_opacity(1).set_value(m_new),
                          run_time=0.5)
            m = m_new
            new_bars = []
            for k in ks:
                bars[k] = bar(k, m)
                new_bars.append(GrowFromEdge(bars[k], DOWN))
            ell += sum(math.exp(scores[k] - m) for k in ks)
            self.play(*new_bars, run_time=0.6)
            self.play(Indicate(eq2, color=L_COL, scale_factor=1.04),
                      l_tr.animate.set_value(ell), run_time=0.6)
            self.wait(0.3)

        # normalise and compare with the exact softmax
        fin = Tex(r"divide by $\ell$ $\Rightarrow$ exactly $\mathrm{softmax}(s)$,\\"
                  r"without ever seeing the whole row at once",
                  font_size=32).move_to([-0.4, 0.62, 0])
        self.play(Write(fin), run_time=1.0)
        self.play(*[bars[k].animate.set_fill(O_COL, opacity=0.8) for k in range(8)],
                  run_time=0.6)
        self.wait(1.0)
        o_eq = MathTex(r"O", r"\leftarrow", r"O", r"\cdot", r"\tfrac{\ell_{\text{old}}}{\ell_{\text{new}}}\,e^{m_{\text{old}}-m_{\text{new}}}",
                       r"+ \sum_j \tfrac{e^{s_j - m_{\text{new}}}}{\ell_{\text{new}}} v_j",
                       font_size=34).move_to([0, 3.0 - 0.35, 0])
        o_eq[0].set_color(O_COL); o_eq[2].set_color(O_COL)
        o_note = Tex(r"the output row gets the very same rescale", font_size=28,
                     color=GREY_B).next_to(o_eq, DOWN, buff=0.15)
        self.play(FadeOut(eqs), FadeOut(title), run_time=0.4)
        self.play(Write(o_eq), FadeIn(o_note), run_time=1.2)
        self.wait(1.6)
        self.play(*[FadeOut(m) for m in self.mobjects], run_time=0.6)

    # ------------------------------------------------------------ 4
    def warp(self):
        title = section(self, None, "Inside the kernel: one warp")
        cell = 0.3
        grid = VGroup(*[
            Square(side_length=cell, stroke_color=GREY_D, stroke_width=1)
            for _ in range(4 * 32)
        ]).arrange_in_grid(rows=4, cols=32, buff=0).move_to([0, 1.3, 0])
        rl = Tex(r"4 query rows", font_size=28, color=Q_COL).next_to(grid, LEFT, 0.2)
        cl = Tex(r"32 lanes $=$ 32 keys of the tile", font_size=28,
                 color=K_COL).next_to(grid, UP, 0.15)
        self.play(Create(grid), Write(rl), Write(cl), run_time=1.0)
        rng = random.Random(3)
        self.play(LaggedStart(*[
            c.animate.set_fill(WHITE, opacity=0.2 + 0.7 * rng.random()) for c in grid
        ], lag_ratio=0.004), run_time=1.0)
        sub = Tex(r"16 warps $\times$ 4 rows $=$ 64 rows per block (512 threads)",
                  font_size=28, color=GREY_B).next_to(grid, DOWN, 0.2)
        self.play(FadeIn(sub), run_time=0.5)
        self.wait(0.6)

        # butterfly
        n = 32
        cols = color_gradient([BLUE_C, TEAL_C, GREEN_C, YELLOW_C, GOLD_C, RED_C], n)
        dots = VGroup(*[Dot(radius=0.09, color=c) for c in cols]).arrange(RIGHT, buff=0.24)
        dots.move_to([0, -1.2, 0])
        dl = Tex(r"each lane: its own $(m, \ell)$", font_size=28,
                 color=GREY_B).next_to(dots, DOWN, 0.35)
        self.play(FadeIn(dots, lag_ratio=0.05), FadeIn(dl), run_time=0.8)
        fn = Tex(r"\texttt{\_\_shfl\_xor\_sync}: 5 swaps and every lane agrees",
                 font_size=30).next_to(dots, UP, 0.9)
        self.play(Write(fn), run_time=0.8)
        cur = [ManimColor(c) for c in cols]
        for off in (16, 8, 4, 2, 1):
            arcs = VGroup()
            for a in range(n):
                b = a ^ off
                if b > a:
                    arcs.add(ArcBetweenPoints(dots[a].get_center(), dots[b].get_center(),
                                              angle=-PI / 2, stroke_width=1.5,
                                              color=GREY_B))
            lab = MathTex(rf"\text{{xor }}{off}", font_size=30).next_to(dots, RIGHT, 0.3)
            self.play(Create(arcs), FadeIn(lab), run_time=0.45)
            new = [interpolate_color(cur[a], cur[a ^ off], 0.5) for a in range(n)]
            self.play(*[dots[a].animate.set_color(new[a]) for a in range(n)],
                      FadeOut(arcs), FadeOut(lab), run_time=0.45)
            cur = new
        done = Tex(r"one $(m, \ell)$ per row for the whole tile",
                   font_size=28, color=WHITE).move_to(dl)
        self.play(Transform(dl, done), run_time=0.5)
        self.wait(1.0)
        self.play(*[FadeOut(m) for m in self.mobjects], run_time=0.6)

    # ------------------------------------------------------------ 5
    def outro(self):
        title = section(self, None, "What comes out")
        o = Rectangle(width=1.0, height=4, color=O_COL, fill_opacity=0.25).move_to([-1.2, -0.4, 0])
        lse = Rectangle(width=0.3, height=4, color=M_COL, fill_opacity=0.35).next_to(o, RIGHT, 1.3)
        ol = MathTex(r"O\ (N \times 64)", color=O_COL, font_size=34).next_to(o, UP)
        ll = MathTex(r"\mathrm{LSE}\ (N)", color=M_COL, font_size=34).next_to(lse, UP)
        self.play(FadeIn(o), FadeIn(lse), Write(ol), Write(ll), run_time=0.8)
        eq = MathTex(r"\mathrm{LSE}_i", r"=", r"m_i", r"+ \log", r"\ell_i", font_size=44)
        eq[0].set_color(M_COL); eq[2].set_color(M_COL); eq[4].set_color(L_COL)
        eq.move_to([3.4, 0.6, 0])
        why = Tex(r"one extra float per row.\\backward rebuilds the\\softmax from it",
                  font_size=30, color=GREY_B).next_to(eq, DOWN, 0.4)
        self.play(Write(eq), run_time=0.8)
        self.play(FadeIn(why), run_time=0.6)
        self.wait(2.0)
        self.play(*[FadeOut(m) for m in self.mobjects], run_time=0.8)


# =============================================================== BACKWARD
class FlashBackward(Scene):
    def construct(self):
        self.flip()
        self.rebuild()
        self.sweep()
        self.atomics()

    # ------------------------------------------------------------ 1
    def flip(self):
        title = section(self, None, "Backward flips who owns what")
        g = TileGrid(size=0.5).move_to([-2.2, -0.4, 0])
        self.play(Create(g), run_time=0.8)
        rb = g.row_band(5, Q_COL)
        arr = Arrow(rb.get_left() + RIGHT * 0.2, rb.get_right() + LEFT * 0.2,
                    color=Q_COL, buff=0, stroke_width=4)
        fl = Tex(r"forward: a block owns\\", r"64 query rows", r",\\sweeps across K/V",
                 font_size=32).move_to([3.4, 1.0, 0])
        fl[1].set_color(Q_COL)
        self.play(FadeIn(rb), GrowArrow(arr), Write(fl), run_time=1.0)
        self.wait(0.8)

        cb = g.col_band(2, K_COL)
        arr2 = Arrow(cb.get_top() + DOWN * 0.2, cb.get_bottom() + UP * 0.2,
                     color=K_COL, buff=0, stroke_width=4)
        bl = Tex(r"backward: a block owns\\", r"32 key/value rows", r",\\sweeps down Q",
                 font_size=32).next_to(fl, DOWN, buff=0.6)
        bl[1].set_color(K_COL)
        self.play(Rotate(VGroup(rb, arr), angle=-PI / 2, about_point=g.get_center()),
                  run_time=1.0)
        self.play(ReplacementTransform(rb, cb), ReplacementTransform(arr, arr2),
                  fl.animate.set_opacity(0.35), Write(bl), run_time=0.9)
        why = Tex(r"so $dK_j$ and $dV_j$ have exactly one owner", font_size=30,
                  color=GREY_B).to_edge(DOWN, buff=0.4)
        self.play(Write(why), run_time=0.8)
        self.wait(1.4)
        self.play(*[FadeOut(m) for m in self.mobjects], run_time=0.6)

    # ------------------------------------------------------------ 2
    def rebuild(self):
        title = section(self, None, "Nothing $N\\times N$ was saved, so rebuild it")
        eq = MathTex(r"P_{ij}", r"=", r"\exp\!\Big(", r"\tfrac{q_i \cdot k_j}{\sqrt{d}}",
                     r"-", r"\mathrm{LSE}_i", r"\Big)", font_size=54)
        eq[0].set_color(WHITE); eq[5].set_color(M_COL)
        eq.move_to([0, 1.2, 0])
        self.play(Write(eq), run_time=1.2)
        b = Brace(eq[5], DOWN, color=M_COL)
        bt = b.get_tex(r"\text{the one float per row from forward}").scale(0.7).set_color(M_COL)
        self.play(GrowFromCenter(b), FadeIn(bt), run_time=0.7)
        self.wait(0.8)
        d = MathTex(r"D_i", r"=", r"\textstyle\sum_d", r"\, dO_{id}", r"\, O_{id}", font_size=44)
        d[0].set_color(G_COL); d[3].set_color(G_COL); d[4].set_color(O_COL)
        d.move_to([0, -1.6, 0])
        dn = Tex(r"precomputed by a tiny helper kernel, one warp per row",
                 font_size=28, color=GREY_B).next_to(d, DOWN, 0.25)
        self.play(Write(d), FadeIn(dn), run_time=1.0)
        self.wait(1.4)
        self.play(*[FadeOut(m) for m in self.mobjects], run_time=0.6)

    # ------------------------------------------------------------ 3
    def sweep(self):
        title = section(self, None, "One block walks down its column")
        g = TileGrid(size=0.45).move_to([-3.0, -0.2, 0])
        q = segmented_bar(NT, 0.25, 0.45 * NT, Q_COL).next_to(g, LEFT, 0.12)
        ql = MathTex("Q,\\,dO", color=Q_COL, font_size=30).next_to(q, LEFT, 0.1)
        j = 2
        cb = g.col_band(j, K_COL, op=0.08)
        kv = Tex(r"$K_j, V_j$ stay in\\shared memory", font_size=26,
                 color=K_COL).next_to(g, UP, 0.15).align_to(cb, LEFT).shift(LEFT * 0.5)
        self.play(Create(g), FadeIn(q), Write(ql), FadeIn(cb), FadeIn(kv), run_time=1.0)

        lines = [
            (r"P", r"= \exp(q k^{\top}/\sqrt d - \mathrm{LSE})", WHITE),
            (r"dV_j", r"\mathrel{+}= P^{\top} dO_i", V_COL),
            (r"dS", r"= P \odot (dO_i V_j^{\top} - D_i)", G_COL),
            (r"dK_j", r"\mathrel{+}= dS^{\top} Q_i / \sqrt d", K_COL),
            (r"dQ_i", r"\mathrel{+}= dS\, K_j / \sqrt d \quad \text{(atomicAdd)}", Q_COL),
        ]
        eqs = VGroup()
        for lhs, rhs, c in lines:
            e = MathTex(lhs, rhs, font_size=32)
            e[0].set_color(c)
            eqs.add(e)
        eqs.arrange(DOWN, aligned_edge=LEFT, buff=0.28).move_to([2.9, 0.3, 0])
        for e in eqs:
            e.set_opacity(0.3)
        self.play(FadeIn(eqs), run_time=0.6)

        # register accumulators
        acc_x = g.get_left()[0]
        dk_l = MathTex("dK_j", font_size=28, color=K_COL)
        dv_l = MathTex("dV_j", font_size=28, color=V_COL)
        dk_l.move_to([acc_x - 0.5, -2.55, 0]); dv_l.move_to([acc_x - 0.5, -3.05, 0])
        regs = Tex("in registers", font_size=24, color=GREY_B).next_to(dv_l, DOWN, 0.08).align_to(dv_l, LEFT)
        dk = Rectangle(width=0.01, height=0.3, color=K_COL, fill_opacity=0.7).move_to([acc_x, -2.55, 0], aligned_edge=LEFT)
        dv = Rectangle(width=0.01, height=0.3, color=V_COL, fill_opacity=0.7).move_to([acc_x, -3.05, 0], aligned_edge=LEFT)
        self.play(FadeIn(dk_l), FadeIn(dv_l), FadeIn(dk), FadeIn(dv), FadeIn(regs), run_time=0.5)

        step = 0.45
        prev_tile = None
        for i in range(NT):
            cell = g.at(i, j)
            if i < j:
                tile = Square(side_length=0.45, stroke_width=0).set_fill(MASK, 0.45).move_to(cell)
            elif i == j:
                tile = heat_tile(0.45, WHITE, 40 + i, causal_diag=True).move_to(cell)
            else:
                tile = heat_tile(0.45, WHITE, 40 + i).move_to(cell)
            seg_on = q[i].animate.set_fill(Q_COL, opacity=0.9)
            anims = [FadeIn(tile), seg_on]
            if prev_tile is not None:
                anims += [prev_tile.animate.set_opacity(0.15),
                          q[i - 1].animate.set_fill(Q_COL, opacity=0.15)]
            self.play(*anims, run_time=0.4)
            prev_tile = tile

            grow_k = i >= j
            new_w = dk.width + (step if grow_k else 0)
            if i == j + 1:
                # walk through the math once, slowly
                for e in eqs:
                    self.play(e.animate.set_opacity(1), run_time=0.45)
                    if e is eqs[1]:
                        self.play(dv.animate.stretch_to_fit_width(dv.width + step).align_to(dv, LEFT), run_time=0.35)
                    if e is eqs[3]:
                        self.play(dk.animate.stretch_to_fit_width(new_w).align_to(dk, LEFT), run_time=0.35)
                    self.play(e.animate.set_opacity(0.55), run_time=0.15)
                self.wait(0.4)
            else:
                if i == 0:
                    zt = Tex(r"above the diagonal: $P = 0$", font_size=26,
                             color=GREY_B).next_to(g, DOWN, 0.15).shift(RIGHT * 1.3)
                    self.play(FadeIn(zt), run_time=0.3)
                if grow_k:
                    self.play(dk.animate.stretch_to_fit_width(new_w).align_to(dk, LEFT),
                              dv.animate.stretch_to_fit_width(dv.width + step).align_to(dv, LEFT),
                              run_time=0.3)
        self.wait(0.8)
        once = Tex(r"loop done: $dK_j$, $dV_j$ written to memory once", font_size=30,
                   color=WHITE).move_to([2.9, -2.6, 0])
        self.play(Write(once), Indicate(VGroup(dk, dv), color=WHITE), run_time=1.0)
        self.wait(1.4)
        self.play(*[FadeOut(m) for m in self.mobjects], run_time=0.6)

    # ------------------------------------------------------------ 4
    def atomics(self):
        title = section(self, None, "The awkward one: $dQ$")
        g = TileGrid(size=0.45).move_to([0.6, -0.3, 0])
        dq = segmented_bar(NT, 0.3, 0.45 * NT, Q_COL).next_to(g, LEFT, 0.9)
        dql = MathTex("dQ", color=Q_COL, font_size=36).next_to(dq, LEFT, 0.15)
        cols = VGroup(*[g.col_band(j, K_COL, op=0.05) for j in range(NT)])
        self.play(Create(g), FadeIn(dq), Write(dql), FadeIn(cols), run_time=0.9)
        txt = Tex(r"row $i$ of $dQ$ gets a piece\\from \emph{every} block", font_size=30).move_to([4.9, 1.2, 0])
        self.play(Write(txt), run_time=0.8)
        i = 5
        arrows = VGroup()
        for j in range(NT):
            c = g.at(i, j)
            arrows.add(CurvedArrow(c.get_center(), dq[i].get_right() + RIGHT * 0.05,
                                   angle=0.35 + 0.05 * j, color=Q_COL, stroke_width=2,
                                   tip_length=0.15))
        self.play(LaggedStart(*[Create(a) for a in arrows], lag_ratio=0.15), run_time=1.6)
        self.play(Flash(dq[i], color=Q_COL, flash_radius=0.4),
                  dq[i].animate.set_fill(Q_COL, opacity=0.9), run_time=0.6)
        at = Tex(r"so each block uses \texttt{atomicAdd}", font_size=30,
                 color=Q_COL).next_to(txt, DOWN, 0.5)
        self.play(Write(at), run_time=0.8)
        self.wait(1.2)
        self.play(FadeOut(arrows), FadeOut(txt), FadeOut(at), run_time=0.5)

        trade = VGroup(
            MathTex(r"+1\ \ QK^{\top}\ \text{recompute}", font_size=36, color=G_COL),
            MathTex(r"-N^2\ \ \text{floats of memory}", font_size=36, color=O_COL),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.3).move_to([5.0, 0.2, 0])
        self.play(Write(trade[0]), run_time=0.8)
        self.play(Write(trade[1]), run_time=0.8)
        self.wait(2.2)
        self.play(*[FadeOut(m) for m in self.mobjects], run_time=0.8)
