---
title: The MyTorch Gallery
date: 2026-10-06
description: A running exhibit of the first things MyTorch ever made on its own
tags: mytorch, transformers, llama 3.1
---

# The MyTorch Gallery

[MyTorch](https://github.com/1611Dhruv/mytorch) is my own "PyTorch" (hence the aptly chosen name): a deep learning framework I wrote from scratch in C++ and CUDA, from the autograd engine all the way down to my own GPU kernels. There is no PyTorch, cuBLAS or cuDNN hiding underneath, so every number a model crunches goes through code I wrote. It's my most ambitious project yet, and this post is the fun part: a gallery of things MyTorch models have actually made.

---

## Exhibit 1 — Timmy Stories

Once I was done with all the necessary layers (which took 3 months 😭), I did what every CS major in 2026 does: build a transformer from scratch. I like to call this one [timmy-stories.mytorch](https://drive.google.com/file/d/1o7WRg2GqxUzSJOZ_LEqdDt8V35jqzZR2/view?usp=sharing) because it always tries to tell stories about a little boy named Tim.

```exhibit
What is love?" With eager she loved to sort [...] making his brother too.
<|endoftext|>
Once upon a time, there was a little boy named Tim. Tim lived in a small house with his mom and dad. They were glad because they played games for a new game to play. Tim played and played all day long. He was good at playing outside.
One day, Tim and his mom went to the store to play. They saw a big pile of cherries in the sky. They were having fun! But then, something shiny in the sky. Tim was very surprised. He showed his mom the cherry sand. She said it was dangerous.
Then, something unexpected happened. Tim took the cherries, and the cherry little boy was safe
---
Prompt: What is love?
timmy-stories.mytorch, 2026
C++ and CUDA, 14.8 million parameters
Cross-entropy loss 0.55
```

As you can see, Timmy stories are funny and beautiful. In nearly 40% of my inference runs, the model would wrap up whatever story I asked for and then, completely unprompted, launch straight into a tale about a little boy named Tim. My first guess was bias in the data, and sure enough, almost 1 in 4 stories in TinyStories mention a Tim (honestly, they should just call the dataset TimmyStories :P)

I also have a feeling the model wasn't big enough, and I didn't let it train long enough, for it to grasp the bigger picture of a story, like its plot or how to string events together into something coherent. So for now, Tim keeps finding cherries in the sky, and I keep finding Tim in my stories :)
