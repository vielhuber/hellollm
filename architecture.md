# architecture

This file contains the nodes and connections used by the interactive architecture viewer.

<a id="training-data-pre"></a>

## PRE-TRAINING DATA

<!-- class: data -->
<!-- description: Source text for base training -->

<a id="training-set-pre"></a>

### Training set

The collected text used for pre-training.

<!-- to: batch-step | sample batch -->

<a id="common-crawl"></a>

### Common Crawl

[commoncrawl.org](https://commoncrawl.org)<br>
About 100,000 GB.

<!-- to: training-set-pre | collect -->

<a id="webtext2"></a>

### WebText2

[openwebtext2.readthedocs.io](https://openwebtext2.readthedocs.io)<br>
About 70 GB.

<!-- to: training-set-pre | collect -->

<a id="wikipedia"></a>

### Wikipedia

[wikipedia.org](https://www.wikipedia.org)<br>
About 100 GB.

<!-- to: training-set-pre | collect -->

<a id="the-pile"></a>

### The Pile

[arxiv.org/abs/2101.00027](https://arxiv.org/abs/2101.00027)<br>
About 1,000 GB.

<!-- to: training-set-pre | collect -->

<a id="books"></a>

### Books 1/2

Unknown size and source.

<!-- to: training-set-pre | collect -->

<a id="pre-training"></a>

## PRE-TRAINING

<!-- class: training -->
<!-- layout: main -->
<!-- description: Learns by predicting the next token -->

<a id="model-setup"></a>

### Model setup

Transformer architecture.<br>
Tokenizer and vocabulary.<br>
Maximum sequence length.<br>
Numeric precision.

<!-- to: initial-weights | initialize model -->

<a id="training-system"></a>

### Training system

GPU and VRAM.<br>
Runtime software.<br>
Fast storage for data and checkpoints.

<!-- to: batch-step | provide compute -->

<a id="initial-weights"></a>

### Initial weights

Model numbers that start random before training.<br>
`[[0.01][-0.02][0.00]...]`<br>
`[[-0.03][0.01][0.02]...]`

<!-- to: batch-step | first step weights -->

<a id="batch-step"></a>

### Batch / training step

A small part of the training set.

<!-- to: training-example | select sequence -->

<a id="training-example"></a>

### Training example

Input: `"Every effort moves you"`<br>
Known next token: `" forward"`

<!-- to: tokenized-text | tokenize input -->

<a id="tokenized-text"></a>

### Tokenized text

`"Every" | " effort" | " moves" | " you"`

<!-- to: token-ids | map to ids -->
<!-- to: token | forms | dashed -->

<a id="token-ids"></a>

### Token IDs

`6109 | 3626 | 6100 | 345`

<!-- to: token-embeddings | look up token vectors -->
<!-- to: positional-embeddings | use sequence positions -->

<a id="token-embeddings"></a>

### Token embeddings

`[[2.4][2.4][2.1]...]`<br>
`[[-2.6][1.3][2.1]...]`<br>
`[[2.0][1.8][-1.6]...]`<br>
`[[2.9][1.2][0.5]...]`

<!-- to: input-embeddings | add -->

<a id="positional-embeddings"></a>

### Positional embeddings

One vector per place in the sequence, not per token ID.<br>
Some models add these vectors; many current LLMs use RoPE inside attention.<br>
`[[0.1][0.0][0.2]...]`<br>
`[[0.2][0.1][0.1]...]`<br>
`[[0.3][0.2][0.0]...]`<br>
`[[0.4][0.3][0.1]...]`

<!-- to: input-embeddings | add -->

<a id="input-embeddings"></a>

### Input embeddings

Here: token embeddings plus positional embeddings.<br>
`[[2.5][2.4][2.3]...]`<br>
`[[-2.4][1.4][2.2]...]`<br>
`[[2.3][2.0][-1.6]...]`<br>
`[[3.3][1.5][0.6]...]`

<!-- to: transformer-block | run model -->

<a id="transformer-block"></a>

### Transformer block N×

Layer normalization.<br>
Masked multi-head self-attention.<br>
A causal mask hides future tokens.<br>
Shortcut connection.

<!-- to: attention-head | calculate attention -->
<!-- to: self-attention | uses | dashed -->

<a id="attention-head"></a>

### One attention head

Example relation scores:<br>
Every: `1.0000`<br>
effort: `0.5517 | 0.4483`<br>
moves: `0.3800 | 0.3097 | 0.3103`<br>
you: `0.2758 | 0.2460 | 0.2462 | 0.2320`

<!-- to: model-outputs | layer normalization + feed forward -->

<a id="model-outputs"></a>

### Contextual outputs

One context-aware vector per input token.<br>
`[[1.8][-0.4][2.7]...]`<br>
`[[-1.1][2.5][0.8]...]`<br>
`[[0.6][1.9][-1.3]...]`<br>
`[[2.2][0.3][1.4]...]`

<!-- to: next-token-probabilities | output projection + softmax -->

<a id="next-token-probabilities"></a>

### Next-token probabilities

Raw score per token, not yet a probability.<br>
Logits: `[-0.4929, ..., 2.4812, ..., -0.6093]`<br>
Softmax probabilities: `[0.0001, ..., 0.0200, ..., 0.0001]`

<!-- to: prediction-loss | predict + compare with target -->

<a id="prediction-loss"></a>

### Prediction and loss

Highest probability: `0.0200`.<br>
Predicted ID `2651`: `" forward"`.<br>
Example continuation: `"Every effort moves you forward"`.<br>
Known target: `" forward"`.<br>
The loss measures all predicted probabilities against the target.<br>
This shows one position; training normally scores many positions in parallel.

<!-- to: updated-weights | backpropagate + optimize -->
<!-- to: text-generation | same prediction mechanism | dashed -->

<a id="updated-weights"></a>

### Updated weights

Model numbers updated after an optimizer step and included in checkpoints.<br>
`[[0.01][-0.02][0.00]...]`<br>
`[[-0.03][0.01][0.02]...]`

<!-- to: more-training | finish training step -->

<a id="more-training"></a>

### More training?

Continue with more batches and steps, or stop when the training budget is reached.

<!-- to: batch-step | next batch with updated weights | loop -->
<!-- to: final-weights | stop: keep final weights -->

<a id="final-weights"></a>

### Final weights

Learned values after training.<br>
`[[0.84][-1.20][0.37]...]`<br>
`[[1.02][0.15][-0.66]...]`

<!-- to: pretrained-base-model | reuse for post-training -->

<a id="training-data-post"></a>

## POST-TRAINING DATA

<!-- class: data -->
<!-- description: Examples and preferences for further training -->

<a id="training-set-post"></a>

### Training set

Examples or preference pairs used for post-training.

<!-- to: posttraining-loss | provide target or preference -->

<a id="example-1"></a>

### Example #1

Q: Convert 45 kilometers to meters.<br>
A: 45 kilometers is 45,000 meters.

<!-- to: training-set-post | collect -->

<a id="example-2"></a>

### Example #2

Q: Provide a synonym for bright.<br>
A: A synonym for bright is radiant.

<!-- to: training-set-post | collect -->

<a id="example-3"></a>

### Example #3

Q: Remove passive voice in "The song was composed by the artist."<br>
A: The artist composed the song.

<!-- to: training-set-post | collect -->

<a id="post-training"></a>

## POST-TRAINING

<!-- class: posttraining -->
<!-- layout: main -->
<!-- description: Improves behavior after pre-training -->

<a id="pretrained-base-model"></a>

### Pretrained base model

Architecture, tokenizer and weights as Safetensors.<br>
It may load in 4-bit for QLoRA.<br>
It is not a GGUF file.<br>
`[[0.84][-1.20][0.37]...]`<br>
`[[1.02][0.15][-0.66]...]`

<!-- to: current-trainable-weights | initialize -->

<a id="current-trainable-weights"></a>

### Current trainable weights

Full fine-tuning changes the model weights.<br>
LoRA and QLoRA keep the base model fixed and change adapter weights.<br>
The changing weights are included in checkpoints.

<!-- to: posttraining-loss | run example / preference batch -->

<a id="posttraining-loss"></a>

### Model output and loss

Supervised fine-tuning compares the model answer with an example answer.<br>
Preference alignment compares preferred and rejected answers.

<!-- to: updated-trainable-weights | backpropagate + optimize -->

<a id="updated-trainable-weights"></a>

### Updated trainable weights

Weights after one post-training step.<br>
Full fine-tuning updates model weights.<br>
LoRA and QLoRA update adapter weights.

<!-- to: more-posttraining | finish post-training step -->

<a id="more-posttraining"></a>

### More posttraining?

Continue with more examples and steps, or stop when the training budget is reached.

<!-- to: current-trainable-weights | next step with updated weights | loop -->
<!-- to: training-result | stop: keep learned weights -->

<a id="training-result"></a>

### Training result

Updated model weights or learned adapter weights.<br>
`[[0.79][-1.15][0.41]...]`<br>
`[[0.98][0.22][-0.60]...]`

<!-- to: lora-adapter | LoRA / QLoRA: save changes -->
<!-- to: full-model-safetensors | full fine-tuning: save model -->

<a id="training-artifacts"></a>

## MODEL FILES

<!-- class: artifact -->
<!-- layout: main -->
<!-- description: Saves weights for training or local inference -->

<a id="lora-adapter"></a>

### LoRA adapter

A small file with learned changes only.<br>
It needs the base model.

<!-- to: full-model-safetensors | merge with base model -->

<a id="full-model-safetensors"></a>

### Full model Safetensors

Full fine-tuning saves the updated model.<br>
For LoRA and QLoRA, merge the base model and adapter.<br>
The resulting model can be trained again.

<!-- to: gguf-files | quantize + pack -->

<a id="gguf-files"></a>

### GGUF files

A quantized model packed for inference, for example `llama-7b-Q4_K_M.gguf`.<br>
It is not a Studio training source.

<a id="tokens-context"></a>

## TOKENS & CONTEXT

<!-- class: context -->
<!-- description: Explains what the model can read at once -->

<a id="token"></a>

### Token

A whole common word, a word part, a space, punctuation or one special character.

<!-- to: rough-token-counts | count -->
<!-- to: vocabulary | look up in -->
<!-- to: context-window | fill -->

<a id="rough-token-counts"></a>

### Rough token counts

1,000 English words: about 1,300 tokens.<br>
1,000 German words: about 1,500-2,000 tokens.<br>
100 book pages: about 60,000-90,000 tokens.

<a id="vocabulary"></a>

### Vocabulary

The list of tokens known by the model.<br>
It can contain about 200,000 tokens.

<a id="context-window"></a>

### Context window

All tokens visible now: system prompt, chat, model answers and retrieved documents.<br>
Early models: 512 tokens.<br>
New models: up to millions.

<!-- to: text-generation | feed one step -->
<!-- to: self-attention | processed with | dashed -->

<a id="text-generation"></a>

### Text generation

One new token per step.<br>
The new token becomes part of the next input.<br>
Repeat until finished.

<!-- to: kv-cache | reuse past states -->

<a id="kv-cache"></a>

### KV cache

During text generation, it keeps earlier attention keys and values in RAM.<br>
It avoids recalculating them but grows with the context.

<a id="attention-cost"></a>

## ATTENTION & COST

<!-- class: cost -->
<!-- description: Explains how context creates compute and memory costs -->

<a id="self-attention"></a>

### Self-attention

Each token checks every allowed earlier token.<br>
Relation scores store context and meaning.

<!-- to: attention-heads | split patterns across -->
<!-- to: quadratic-work | create relations -->

<a id="attention-heads"></a>

### Attention heads

Many views run in parallel.<br>
Heads can learn patterns such as word order, punctuation, subject and verb, adjective and noun, or different meanings of "bank".

<a id="quadratic-work"></a>

### Quadratic work

`n` tokens create about `n²` token relations.<br>
10 → 100.<br>
1,000 → 1 million.<br>
10,000 → 100 million.<br>
500,000 → 250 billion.

<!-- to: training-cost | during learning -->
<!-- to: inference-cost | during use -->

<a id="training-cost"></a>

### Training cost

Matrix work for tokens and batches runs in parallel on many GPUs.<br>
It needs much hardware, electricity and cooling water.

<!-- to: optimizations | reduce with -->

<a id="inference-cost"></a>

### Inference cost

Long context needs more computation, RAM, time and money.<br>
Token use is often billed.

<!-- to: optimizations | reduce cost with -->

<a id="optimizations"></a>

### Optimizations

Optimized attention kernels, batching and lower precision reduce time and memory.<br>
They usually do not remove the basic `n²` attention relations.
