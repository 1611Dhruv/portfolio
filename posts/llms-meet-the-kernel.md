---
title: What Happens When You Let an LLM Touch Your Kernel
date: 2025-03-15
description: Notes from my research on LLM-guided Linux kernel policy optimization — the wins, the chaos, and the guardrails.
tags: research, linux, llms, systems
---

# What Happens When You Let an LLM Touch Your Kernel

Sounds scary, right? It kind of is. But also — it works better than you'd think.

## The premise

At UW-Madison, I've been researching whether large language models can generate and optimize Linux kernel-space policies. Specifically, we're looking at **Page Cache** behavior: how the kernel decides what to keep in memory, what to evict, and when.

The traditional approach to tuning these policies is manual, requires deep kernel expertise, and is workload-specific. What if an LLM could reason about performance metrics and generate policies that adapt?

## How it works (the short version)

1. **Instrument the kernel** with eBPF to collect runtime signals — cache hit/miss ratios, memory pressure, I/O wait times, workload characteristics
2. **Feed those signals to an LLM** along with the current policy and performance objectives
3. **The LLM generates a candidate policy** — actual kernel-space code
4. **Validate it** through a safety pipeline (this is the important part) — we check for correctness, stability, and performance constraints before anything touches a running kernel
5. **Deploy and benchmark** against baselines like ScaleCache

## The results so far

Under specific workloads (YCSB, DuckDB analytical queries, Twitter production traces), LLM-generated policies can **match or outperform** hand-tuned approaches. The key word is "specific" — this isn't a universal win, but it shows the approach has real promise.

## The hard part

Safety. You can't just `eval()` whatever an LLM spits out in kernel space. Our validation pipeline is arguably more interesting than the generation itself — rollback mechanisms, constraint checking, sandboxed execution via eBPF hooks. If the policy violates any invariant, it gets rejected before it can do damage.

## What's next

We're expanding to other kernel subsystems and exploring whether the LLM can learn from its failures to generate better policies over time. Stay tuned.
