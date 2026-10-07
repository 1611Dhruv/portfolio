<!-- Samples cut from posts/mytorch-gallery.md on 2026-10-06. Not published. -->

# Gallery outtakes

**Prompt:** `Once upon a time there was a boy named Tim.`

<pre style="white-space:pre-wrap;word-break:break-word;overflow-x:visible"><code>Once upon a time there was a boy named Tim. Tim loved to play outside in the sun. He would run, jump, and show his toys all around his room. Everyone had so much fun and they ran on adventure.
One day, while playing outside, Tim saw a big orange ball in the park. The ball went up in the sky and played with it. Tim was very sad and scared. His friends came to him.
Then, something unexpected happened. The ball started to glow and ran to them. It was time for Tim and his friends their glow ball. They laughed and played together, happy and full.
&lt;|endoftext|&gt;</code></pre>

**Prompt:** `Once upon a time there was a boy named Bob.`

<pre style="white-space:pre-wrap;word-break:break-word;overflow-x:visible"><code>Once upon a time there was a boy named Bob. Bob loved to create all day long. One day, while Bob was creative and wanted to play. Bob did not want to play with Bob.
Bob asked his friend, Sam, "Do you want to play with me?" Sam said, "Yes, I want to play!" So Bob went to find Bob and started to create near her home. They both looked everywhere for Tom.
Bob and Sam walked to the park and saw a big box of shiny coins. They both saw big pictures of yummy things to play with. They had the shiny coins and the dog played together. Now, they all had a fun day.
&lt;|endoftext|&gt;</code></pre>

**Prompt:** _(fill in)_

<pre style="white-space:pre-wrap;word-break:break-word;overflow-x:visible"><code>Once there was a gray cat named Tom. Tom was looking for colors to rock the sunshine. He was nervous because he was a loyal to get math.
Tom loved colors and after dinner, he stirred disappearing. He looked around and saw a big box. The box was warm and soft and rocking all around it.
Tom was so excited. He realized he should never have and get his color in the box. He tried one before it was dark on the box. Tom thought of a fun idea in the box. He called the box to get it</code></pre>


---

<!-- Model section cut from the gallery on 2026-10-06. -->

### The Model

It's loosely based on Llama 3.1 8B, just a lot smaller, with a couple of tweaks. Here's the config:

```text
VOCAB       = 256
BATCH_SZ    = 32
MAX_CONTEXT = 1024
DMODEL      = 384
NHEADS      = 6
DFF         = 1024
NBLOCKS     = 8
```

It starts off with a (256 × 384) embedding layer followed by a learned positional embedding table (instead of RoPE), and then 8 multi-head self-attention blocks, each with a SwiGLU feed-forward layer and pre-RMSNorm. It ends with a final RMSNorm followed by a linear layer that brings it back into the vocab space, hopefully outputting the logits for the next token. That comes to about 14.8M parameters.

I trained it using Adam with a cosine scheduler and warmup (a fancy way of saying ramp the learning rate up, then smooth it out) and cross-entropy loss against the next token.

All in all, the model trained relatively stably and ended with a final validation loss of 0.55, which was pretty decent: the model was only confused between ~1.73 characters. This was not a good indicator of the model writing good stories though :\_)

I have a hunch that my character level tokenizer hindered in the way my model learned. The earlier attention and FFN layers might've tried to correlate individual letters and basically understand what makes up a specific word, and as the model is not deep enough (it's only 8 layers deep) couldn't learn how to make sense of entire sentences and generate coherent stories.

Another issue with my training approach was that I wasn't readily freeing up the gradients and was only training the model at a fp32 precision. Wiring fp16 or bf16 could prove to improve training, but well that's a tomorrow problem :)


---

<!-- Opening of the 'What is love?' sample, cut 2026-10-06. -->

```text
What is love?" With eager she loved to sort the man by her brother, and they became good friends.
One day, a big wind came and blew the man walked to the man. He was so happy at the man before he had helped the man. The man gave her the man back and said, "Thank you! You're so much lovely because I'm making my brother for you." The man and the man became good friends, and they both learned the man was making his brother too.
<|endoftext|>
```
