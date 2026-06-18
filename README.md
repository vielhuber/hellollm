[![Last Commit](https://img.shields.io/github/last-commit/vielhuber/hellollm)](https://github.com/vielhuber/hellollm/commits)
[![License](https://img.shields.io/github/license/vielhuber/hellollm)](https://github.com/vielhuber/hellollm/blob/main/LICENSE.md)

# 🫙 hellollm 🫙

hellollm is a single GitHub-rendered Mermaid architecture diagram that explains how large language models work from raw text through pretraining, embedding, model execution, next-token prediction and post-training.

## architecture

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontSize": "12px", "fontFamily": "Courier New", "primaryColor": "#161b22", "primaryTextColor": "#f0f6fc", "primaryBorderColor": "#30363d", "secondaryColor": "#161b22", "secondaryTextColor": "#f0f6fc", "secondaryBorderColor": "#30363d", "tertiaryColor": "#161b22", "tertiaryTextColor": "#f0f6fc", "tertiaryBorderColor": "#30363d", "clusterBkg": "#0d1117", "clusterBorder": "#30363d", "titleColor": "#c9d1d9", "lineColor": "#8b949e", "edgeLabelBackground": "#0d1117"}, "flowchart": {"htmlLabels": true, "nodeSpacing": 30, "rankSpacing": 44, "curve": "basis"}}}%%
flowchart TD
    subgraph DATA["<b>1.1 DATA</b>"]
        D0["Training set"]
        D1["Common Crawl<br/>https://commoncrawl.org<br/>~100.000 GB"]
        D2["WebText2<br/>https://openwebtext2.readthedocs.io<br/>~70 GB"]
        D3["Wikipedia<br/>https://www.wikipedia.org<br/>~100 GB"]
        D4["The Pile<br/>https://arxiv.org/abs/2101.00027<br/>~1.000 GB"]
        D5["Books1/2<br/>unknown<br/>unknown"]
    end

    subgraph PRE["<b>1.0 PRETRAINING</b>"]
        P0["Initialized/current weights"]
        P1["Run Flow"]
        P1A["Predict next token"]
        P1B["Compare with real data"]
        P2["Optimize weights<br/>minimize training loss"]
        P3["Repeat"]
    end

    subgraph FLOW["<b>1.2 FLOW</b>"]
        F0["Prompt<br/>&quot;This is an&quot;"]
        F1["Generate input embeddings"]
        F2["Run model<br/>transformer / decoder"]
        F3["Generated text<br/>&quot;This is an example&quot;"]
    end

    subgraph EMB["<b>1.3 EMBEDDING</b>"]
        E0["Input text<br/>&quot;Every effort moves you&quot;"]
        E1["Tokenized text<br/>&quot;Every&quot; | &quot; effort&quot; | &quot; moves&quot; | &quot; you&quot;"]
        E2["Token IDs<br/>6109 | 3626 | 6100 | 345"]
        E3["Token embeddings<br/>[[2.4][2.4][2.1]...]<br/>[[-2.6][1.3][2.1]...]<br/>[[2.0][1.8][-1.6]...]<br/>[[2.9][1.2][0.5]...]"]
        E4["Positional embeddings"]
        E5["Input embeddings<br/>token embeddings + positional embeddings"]
    end

    subgraph MODEL["<b>1.4 MODEL</b>"]
        M0["Input embeddings<br/>[[2.4][2.4][2.1]...]<br/>[[-2.6][1.3][2.1]...]<br/>[[2.0][1.8][-1.6]...]<br/>[[2.9][1.2][0.5]...]"]
        M1["Transformer block N×<br/>masked multi-head self attention<br/>causal: future tokens masked"]
        M2["Attention weights example<br/>Your: 1.0000<br/>journey: 0.5517 | 0.4483<br/>starts: 0.3800 | 0.3097 | 0.3103"]
        M3["Layer normalization<br/>GELU activation<br/>Feed forward network<br/>Shortcut connections"]
        M4["Outputs<br/>[[2.4][2.4][2.1]...]<br/>[[-2.6][1.3][2.1]...]<br/>[[2.0][1.8][-1.6]...]<br/>[[2.9][1.2][0.5]...]"]
        M5["Final layer normalization<br/>+ output projection<br/>linear → vocabulary size"]
        M6["Logits<br/>[-0.4929, ..., 2.4812, ..., -0.6093]"]
        M7["Softmax"]
        M8["Probabilities<br/>[0.0001, ..., 0.0200, ..., 0.0001]"]
        M9["Highest probability: 0.0200<br/>Next ID: 290<br/>Next token: &quot; and&quot;"]
    end

    subgraph POST["<b>2.0 / 2.1 POST-TRAINING</b>"]
        T0["Weights from pretraining<br/>+ post-training dataset"]
        T1["Example #1<br/>Q: Convert 45 kilometers to meters.<br/>A: 45 kilometers is 45,000 meters."]
        T2["Example #2<br/>Q: Provide a synonym for bright.<br/>A: A synonym for bright is radiant."]
        T3["Example #3<br/>Q: Remove passive voice in:<br/>&quot;The song was composed by the artist.&quot;<br/>A: The artist composed the song."]
        T4["Supervised fine-tuning<br/>instruction tuning"]
        T5["Preference alignment<br/>RLHF / DPO<br/>learn from better vs. worse"]
        T6["Optimized weights"]
        T7["Repeat"]
    end

    D1 --> D0
    D2 --> D0
    D3 --> D0
    D4 --> D0
    D5 --> D0
    D0 --> P1
    P0 --> P1
    P1 --> F0 --> F1 --> E0 --> E1 --> E2 --> E3 --> E4 --> E5
    E5 --> F2 --> M0 --> M1 --> M2 --> M3 --> M4 --> M5 --> M6 --> M7 --> M8 --> P1A --> M9 --> F3
    M9 --> P1B --> P2 --> P3 --> P1
    P2 --> T0
    T0 --> T1 --> T4
    T0 --> T2 --> T4
    T0 --> T3 --> T4
    T4 --> T5 --> T6 --> T7 --> T4

    classDef data fill:#261a3d,stroke:#a371f7,stroke-width:1px,color:#f0f6fc;
    classDef train fill:#3b2e00,stroke:#d29922,stroke-width:1px,color:#f0f6fc;
    classDef embed fill:#0c2d6b,stroke:#58a6ff,stroke-width:1px,color:#f0f6fc;
    classDef model fill:#0f3a20,stroke:#3fb950,stroke-width:1px,color:#f0f6fc;
    classDef post fill:#4a1016,stroke:#f85149,stroke-width:1px,color:#f0f6fc;
    class D0,D1,D2,D3,D4,D5 data;
    class P0,P1,P1A,P1B,P2,P3,F0,F1,F2,F3 train;
    class E0,E1,E2,E3,E4,E5 embed;
    class M0,M1,M2,M3,M4,M5,M6,M7,M8,M9 model;
    class T0,T1,T2,T3,T4,T5,T6,T7 post;

    click D1 "https://commoncrawl.org" "Open Common Crawl"
    click D2 "https://openwebtext2.readthedocs.io" "Open WebText2"
    click D3 "https://www.wikipedia.org" "Open Wikipedia"
    click D4 "https://arxiv.org/abs/2101.00027" "Open The Pile"
```

## links

- https://sebastianraschka.com/llms-from-scratch
- https://vielhuber.de/blog/large-language-model-selbst-bauen
- https://gist.github.com/vielhuber/81f6eb87fedd5e677144aef2b5476cf7
- https://gist.github.com/vielhuber/8d753f23b642cc326386dcc7ea1585d7
