---
title: Finding GCD
date: 2026-09-27
description: Just a collection of random math facts
tags: euclid's algorithm, bézout's identity, euclid's extended algorithm
---

## Canonical GCD algorithm

There are many variations of this algorithm originating from "The Nine Chapters on the Mathematical Art" to the widely renouned Euclid's Elements the following algorithm appears almost naturally describing a way to find the gcd between 2 positive integers.

This method is based on repeated subtraction (subtracting the smaller element from the larger at each time stamp) until we end up with the gcd.

```cpp

long long gcd(long long a, long long b) {
    if (a < b) swap(a, b);
    if (b == 0) return a;
    return gcd(b, a % b);
}

```

There is something so neat and beautiful about this algorithm. At first glance it seems like there is something illegal happening here and well I definitely felt like it shouldn't work.

\begin{theorem}[Euclid]
For integers $a \ge b > 0$, the algorithm above terminates and returns $\gcd(a, b)$.
\end{theorem}

\begin{proof}
We'll prove it in two parts. The first is the key identity (lemma, whatever you want to call it):

$$
\gcd(a, b) = \gcd(b, a \bmod b)
$$

**Part 1: the identity.** Define the set of common divisors

$$
\newcommand{\CD}{\operatorname{CD}}
\CD(a, b) = \{ x \in \Z : x \mid a \land x \mid b \}.
$$

We'll show that $\CD(a, b) = \CD(b, a \bmod b)$. If the two sets are the same, their largest elements are too, and that's exactly the claim. By the division lemma, $a = bq + (a \bmod b)$ for some $q \in \Z$, or rearranged a bit, $a - bq = a \bmod b$.

$\CD(a,b) \subseteq \CD(b, a \bmod b)$: Let $x \in \CD(a, b)$, so $x \mid a$ and $x \mid b$. Since $x \mid b$, it also divides $bq$, and hence $x \mid a - bq = a \bmod b$. So $x \in \CD(b, a \bmod b)$.

$\CD(a,b) \supseteq \CD(b, a \bmod b)$: Now the other way. Let $x \in \CD(b, a \bmod b)$, so $x \mid b$ and $x \mid a \bmod b$. Then $x$ divides $bq + (a \bmod b)$, which is just $a$. So $x \in \CD(a, b)$.

So the sets are equal. They're nonempty, since $1$ divides everything, and finite, since no element is bigger than $b$. A nonempty finite set has a largest element, which gives

$$
\gcd(a, b) = \max \CD(a, b) = \max \CD(b, a \bmod b) = \gcd(b, a \bmod b).
$$

**Part 2: it actually terminates.** The other thing we need (mayhaps) is that the algorithm stops. Name each step like this:

\begin{align*}
a_1 &= q_1 b_1 + r_1 \\
a_2 &= q_2 b_2 + r_2 \\
&\;\;\vdots \\
a_n &= q_n b_n + r_n
\end{align*}

where each step feeds the next: $a_{i+1} = b_i$ and $b_{i+1} = r_i$. A remainder is always smaller than the thing you divided by, so $r_{i+1} < b_{i+1} = r_i$. Chaining these together,

$$
0 \le r_n < \cdots < r_2 < r_1 < b_1.
$$

The remainders are non-negative integers that drop by at least $1$ every step, so they can't go on forever. Some $r_n$ hits $0$, within $b_1$ steps. Applying Part 1 at every step along the way,

$$
\gcd(a_1, b_1) = \gcd(a_2, b_2) = \cdots = \gcd(a_n, b_n) = \gcd(b_n, 0) = b_n,
$$

which is exactly what the algorithm returns.
\end{proof}

It still feels illegal. Another cool thing is that this actually works in O(log n) time which I find very fascinating. (Proof at the end, once we have a few more tools.)

## Bézout's Identity

Bézout was an 18th-century French mathematician, and this identity carries his name (even if, as we'll see, he wasn't the first to find it):

\begin{theorem}[Bézout]
For $a, b \in \Z^+$ there exist $x, y \in \Z$ with

$$ax + by = \gcd(a, b).$$
\end{theorem}

The story goes that this was already discovered way back by Aryabhata (around 499 CE), who used it to solve equations like $ax + by = c$. His method was later named *kuṭṭaka*, "the pulverizer", because it keeps breaking the numbers down into smaller and smaller ones until the problem is trivial. That's basically Euclid's algorithm run in reverse, which is exactly what the proof below does. In Europe, Bachet had worked out the integer version by 1624, more than a century before Bézout. Bézout's own contribution was showing the identity also holds for univariate polynomials (meaning polynomials in only one variable) over a field (meaning a set where $+$, $-$, $\times$, $\div$ all behave).

\begin{proof}
The proof is an induction over the steps of Euclid's algorithm, running backwards from where it stops. We use the same $a_k, b_k$ as in the previous proof, and let $g = \gcd(a, b)$. By Part 1 of that proof, every step has the same gcd, so $\gcd(a_k, b_k) = g$ for all $k$.

**Base case** ($b_m = 0$) :  Let step $m$ be where the algorithm stops, with $b_m = 0$ (one step past the last line of the previous proof, which is how the code counts it). Then

$$
g = \gcd(a_m, 0) = a_m = a_m \cdot 1 + b_m \cdot 0,
$$

so $x_m = 1$ and $y_m = 0$ work.

**Inductive step.** Suppose that for some $k$ there exist $x_k, y_k \in \Z$ with

$$
a_k x_k + b_k y_k = g.
$$

Now we go one step back, to $k - 1$. From the algorithm, $a_k = b_{k-1}$ and $b_k = a_{k-1} \bmod b_{k-1}$, so $a_{k-1} = q_{k-1} b_{k-1} + b_k$. Multiplying by $y_k$ and substituting $b_k y_k = g - a_k x_k$:

\begin{align*}
a_{k-1} y_k &= q_{k-1} b_{k-1} y_k + b_k y_k \\
            &= q_{k-1} b_{k-1} y_k + g - b_{k-1} x_k && (\text{since } a_k = b_{k-1}) \\
            &= g - b_{k-1} (x_k - q_{k-1} y_k).
\end{align*}

Rearranging,

$$
a_{k-1} y_k + b_{k-1} (x_k - q_{k-1} y_k) = g,
$$

so $x_{k-1} = y_k$ and $y_{k-1} = x_k - q_{k-1} y_k$ work for step $k - 1$.

By induction, this carries all the way back to $k = 1$, where $a_1 = a$ and $b_1 = b$. So $x = x_1$ and $y = y_1$ satisfy $ax + by = \gcd(a, b)$.
\end{proof}

The code below is exactly this proof. The recursion bottoms out at the base case, and `x = y1; y = x1 - (a / b) * y1;` is the inductive step, with `a / b` playing the role of $q_{k-1}$.

```cpp

using ll = long long;
ll _gcd_ext(ll a, ll b, ll &x, ll &y) {
  if (b == 0) {
    x = 1;
    y = 0;
    return a;
  }
  ll x1, y1;
  ll g = _gcd_ext(b, a % b, x1, y1);

  x = y1;
  y = x1 - (a / b) * y1;
  return g;
}
ll gcd_ext(ll a, ll b, ll &x, ll &y) {
  if (a < b) {
    return _gcd_ext(b, a, y, x);
  }
  return _gcd_ext(a, b, x, y);
}

```

## Time Complexity Analysis

Naively you'd think that this algorithm runs in $\O(\min(a, b))$ steps, since all we know so far is that the remainder drops by at least $1$ each time. But turns out we can do better.

We will show that $r_{i+2} < r_i / 2$, which means the remainder at least halves every 2 steps, resulting in $\O(\log \min(a, b))$ time complexity.

\begin{proof}
Step $i + 2$ divides $a_{i+2} = r_i$ by $b_{i+2} = r_{i+1}$, so $r_{i+2} = r_i \bmod r_{i+1}$. (If $r_{i+1} = 0$, the algorithm has already stopped, so assume $r_{i+1} > 0$.) We will consider 2 cases, depending on how big $r_{i+1}$ is compared to $r_i$:

**Case 1** ($r_{i+1} \le r_i / 2$): A remainder is always smaller than the thing you divided by, so

$$
r_{i+2} < r_{i+1} \le \frac{r_i}{2}.
$$

**Case 2** ($r_i / 2 < r_{i+1} < r_i$): Now $r_{i+1}$ fits into $r_i$ exactly once, since $r_i < 2 r_{i+1}$. So the quotient is $1$, and

\begin{align*}
r_{i+2} &= r_i - r_{i+1} \\
        &< r_i - \frac{r_i}{2} \\
        &= \frac{r_i}{2}.
\end{align*}

Either way, $r_{i+2} < r_i / 2$.

So every two steps, the remainder at least halves. It starts below $b_1 = \min(a, b)$, so after $2k$ more steps it's below $\min(a, b) / 2^k$. A remainder can't be a positive number below $1$, so it must hit $0$ once $2^k \ge \min(a, b)$. That's at most about $2 \log_2 \min(a, b)$ steps. Each step is a single `%` on machine integers, which is $\O(1)$, so the whole algorithm runs in $\O(\log \min(a, b))$.
\end{proof}

Fun fact: this bound is basically tight. The worst case is two consecutive Fibonacci numbers, where every quotient is $1$ and the remainders shrink as slowly as possible. Gabriel Lamé proved this in 1844, and his proof is often cited as the beginning of computational complexity theory.
