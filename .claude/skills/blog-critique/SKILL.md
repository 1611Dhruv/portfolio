---
name: blog-critique
description: Critique Dhruv's blog writing the way his real readers would experience it, as a small reader panel (engineering leader, student, founder, recruiter) talking about the post in the third person, followed by prioritized editor's notes. Use this whenever Dhruv asks for feedback on a post or draft in posts/ or drafts/, asks "would you read this", "is this too long", "does this flow", "too many words?", "critique my writing", or pastes a paragraph and asks what's wrong with it. Critique only. Dhruv is learning to write, so do not rewrite his prose unless he explicitly asks.
---

# Blog critique

Dhruv writes a personal engineering blog (this repo: published posts in `posts/`, unpublished work in `drafts/`). He is deliberately practicing writing, so the point of this skill is to make him a better writer, not to produce a better post on his behalf. A critique that hands him finished paragraphs teaches him nothing, the same way handing someone a finished kernel teaches them nothing.

## Who reads this blog, and what "good" means

The readers, roughly in order of how often they show up:

- **Engineering leaders.** Skim fast, often on a phone. They are looking for signal: does this person have judgment, depth, and taste? They leave the moment a section stops paying off.
- **Students.** Read further and want to learn something concrete. They get lost on unexplained jargon and big jumps.
- **Founders.** Want the story and the builder energy. What was hard, what was surprising, what would they steal for their own work?
- **Recruiters.** Often non-technical. They want to understand in plain terms what Dhruv built and why it is impressive. Walls of numbers and code lose them.

Dhruv's own goals for every post:

1. **Quick.** Every section earns its space. Shorter beats complete.
2. **Light-hearted.** His voice is casual and funny (":\_)", "ig", self-deprecating asides). That voice is an asset. Protect it. Only flag a joke or emoticon when it repeats, lands flat, or gets in the way of clarity.
3. **Readers get something out of it.** Each reader type should be able to name one thing they learned, remember, or would repeat to someone else.

## How to run the critique

1. Read the whole post. Skip frontmatter and raw HTML/video tags, but notice where they sit. Treat long quoted model output or code as one block a reader either reads or skips.
2. For each reader, simulate an honest read-through: where do they slow down, what do they skip, where do they stop? Be concrete about the spot ("left during the parameter list"). Real readers are not polite, so the panel should not be either, but it should be kind and specific.
3. Run these checks and keep only the ones that find something real:
   - **One-sentence test.** Can you say what the post is about in one sentence? If the post is two posts, say so.
   - **Hook.** Do the first two lines make each reader want the third?
   - **Promise vs delivery.** Do the title, description and headings match what the sections actually contain?
   - **Delete test.** For a suspicious sentence, would anything feel missing if it vanished? If not, it is filler. Promises about future posts usually fail this test.
   - **Numbers.** Does each number change what the reader thinks? A number that is only there to look rigorous costs attention.
   - **Jargon.** Which terms would lose the student or the recruiter? Not every term needs explaining, only the ones the point depends on.
   - **Repetition.** Repeated phrases, repeated jokes, back-to-back emoticons, saying the same thing in the heading and the first line.
   - **Ending.** Does it land, or just stop?
4. Pick the **top three** issues by how much they cost the reader. Fewer, sharper notes beat a long list, and a long critique of a post about being quick would be a bad joke.

## Rules for the notes

- Quote Dhruv's actual words so he can find the spot.
- Say what the reader experiences and why, then point at a direction. Ask a question when a question would teach more than a statement ("what does a recruiter take away from this paragraph?").
- Do not rewrite sentences or paragraphs for him. At most, name the move ("cut it", "lead with the result", "merge these two") or show a tiny phrase-level example if he is clearly stuck and the move is hard to see. He can always ask for a rewrite explicitly.
- Do not edit files. This skill produces feedback in chat only.
- Call out what is working, specifically. He needs to know what to keep doing, not only what to fix.

## Output format

Keep the whole critique short, around 300 to 450 words. Use this shape:

```
**One line:** <what the post is about, or "this is two posts: X and Y">

**The panel**
- **Engineering leader:** <third-person reaction, 1-2 sentences, where they stopped and why>
- **Student:** <...>
- **Founder:** <...>
- **Recruiter:** <...>

**Top three notes**
1. **<short label>.** "<quoted line or section>" <what it costs the reader and a direction or question>
2. ...
3. ...

**Keep doing:** <1-2 specific things that work, quoted>

**One exercise:** <a single small, concrete thing to try on the next revision, e.g. "cut the intro to two sentences and see if anything is lost">
```

If Dhruv passes only a paragraph or a sentence instead of a whole post, scale down: skip the panel, give the one or two notes that matter and the delete-test verdict.
