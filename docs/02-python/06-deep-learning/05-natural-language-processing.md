# Natural Language Processing with Deep Learning

> **Before you start**: You should understand neural networks (`02-neural-networks-deep-dive.md`), PyTorch (`03-pytorch-fundamentals.md`), and basic NLP concepts (tokenization, embeddings). This guide focuses on deep learning approaches to NLP.

## What is NLP?

Natural Language Processing is the field of teaching computers to understand, interpret, and generate human language. Deep learning has revolutionized NLP, enabling machines to translate languages, answer questions, write essays, and even pass professional exams.

**Simple analogy**: If teaching computers vision is showing them pictures, teaching NLP is having conversations with them until they understand language patterns, grammar, and meaning.

## Why This Matters

- **Transformative technology**: Powers ChatGPT, translation, search engines, voice assistants
- **Hottest job market**: NLP engineers, especially for LLMs, are in extreme demand
- **Foundation of AI agents**: Understanding Transformers is essential for modern AI (see `07-ai-agents/`)
- **Interview critical**: BERT, GPT, attention mechanism questions are standard in ML interviews

## Core NLP Tasks

| Task | Description | Example | Difficulty |
|------|-------------|---------|------------|
| **Text Classification** | Assign label to text | Sentiment analysis, spam detection | Easy |
| **Named Entity Recognition (NER)** | Find entities | "Apple Inc. in California" | Medium |
| **Machine Translation** | Translate languages | English → French | Hard |
| **Question Answering** | Answer questions from context | "When was X born?" | Hard |
| **Text Generation** | Create new text | GPT, story writing | Hard |
| **Summarization** | Condense long text | TL;DR generation | Hard |
| **Text-to-Text** | General conversion | Any NLP task as text-to-text | Hard |

## Evolution of NLP Architectures

```
1. Bag of Words (2000s)          → Count word frequencies, ignore order
2. Word Embeddings (2013)        → Word2Vec, GloVe (dense vectors)
3. RNNs/LSTMs (2014-2017)        → Process sequences, maintain context
4. Attention Mechanism (2014)    → Focus on relevant parts
5. Transformers (2017)           → Attention is all you need
6. BERT (2018)                   → Bidirectional, pre-training
7. GPT-3/4 (2020-2024)          → Massive scale, few-shot learning
8. Instruction-tuned models      → ChatGPT, Claude (follow instructions)
```

## Text Representation

### 1. Tokenization

Convert text to tokens (words, subwords, or characters).

```python
# Word-level tokenization (simple)
text = "I love deep learning!"
tokens = text.lower().split()  # ['i', 'love', 'deep', 'learning!']

# Problems:
# - "learning" and "learning!" are different
# - Unknown words (OOV) can't be handled
# - Large vocabulary size

# Subword tokenization (modern approach)
from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained('bert-base-uncased')
tokens = tokenizer.tokenize("I love deep learning!")
# ['i', 'love', 'deep', 'learning', '!']

# Convert to IDs
input_ids = tokenizer.encode("I love deep learning!")
# [101, 1045, 2293, 2784, 4083, 999, 102]
# 101 = [CLS], 102 = [SEP] (special tokens)

# Decode back
text = tokenizer.decode(input_ids)
# '[CLS] i love deep learning! [SEP]'
```

### 2. Word Embeddings

Convert tokens to dense vectors.

```python
import torch
import torch.nn as nn

# Create embedding layer
vocab_size = 10000  # Number of unique words
embedding_dim = 300  # Vector size for each word

embedding = nn.Embedding(vocab_size, embedding_dim)

# Use it
input_ids = torch.tensor([[1, 5, 432, 67]])  # Batch of token IDs
embedded = embedding(input_ids)
print(embedded.shape)  # torch.Size([1, 4, 300])
# Each word is now a 300-dimensional vector

# Pre-trained embeddings (Word2Vec, GloVe)
# Similar words have similar vectors
# king - man + woman ≈ queen
```

## Recurrent Neural Networks (RNNs)

Process sequences one token at a time, maintaining hidden state.

### Basic RNN

```python
class SimpleRNN(nn.Module):
    def __init__(self, input_size, hidden_size, output_size):
        super(SimpleRNN, self).__init__()
        self.hidden_size = hidden_size

        self.embedding = nn.Embedding(input_size, hidden_size)
        self.rnn = nn.RNN(hidden_size, hidden_size, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)

    def forward(self, x):
        # x: (batch_size, sequence_length)
        embedded = self.embedding(x)  # (batch, seq_len, hidden_size)

        # RNN processes sequence
        output, hidden = self.rnn(embedded)
        # output: (batch, seq_len, hidden_size)
        # hidden: (1, batch, hidden_size) - final hidden state

        # Use final hidden state for classification
        out = self.fc(hidden.squeeze(0))
        return out

# Example: Sentiment classification
model = SimpleRNN(input_size=10000, hidden_size=128, output_size=2)
```

**Problem with basic RNN**: Vanishing gradients (can't remember long-term dependencies)

### LSTM (Long Short-Term Memory)

Solves vanishing gradient problem with gates.

```python
class LSTMClassifier(nn.Module):
    def __init__(self, vocab_size, embedding_dim, hidden_dim, output_dim):
        super().__init__()

        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        self.lstm = nn.LSTM(embedding_dim, hidden_dim, num_layers=2,
                            bidirectional=True, dropout=0.5, batch_first=True)
        self.fc = nn.Linear(hidden_dim * 2, output_dim)  # *2 for bidirectional
        self.dropout = nn.Dropout(0.5)

    def forward(self, text):
        # text: (batch_size, seq_len)
        embedded = self.dropout(self.embedding(text))
        # embedded: (batch, seq_len, emb_dim)

        output, (hidden, cell) = self.lstm(embedded)
        # hidden: (num_layers*2, batch, hidden_dim)

        # Concatenate final forward and backward hidden states
        hidden = torch.cat((hidden[-2,:,:], hidden[-1,:,:]), dim=1)
        # hidden: (batch, hidden_dim*2)

        return self.fc(hidden)

model = LSTMClassifier(vocab_size=10000, embedding_dim=100,
                       hidden_dim=256, output_dim=2)
```

**LSTM advantages**:
- Remembers long-term dependencies
- Gates control information flow (forget, input, output gates)
- Bidirectional: Processes text forward and backward

**LSTM limitations**:
- Sequential processing (slow, can't parallelize)
- Still struggles with very long sequences

## The Transformer Revolution

**Key insight**: You don't need recurrence. Use self-attention to process entire sequence in parallel.

### Self-Attention Mechanism

**Goal**: For each word, figure out which other words are important.

```python
import torch.nn.functional as F

class SelfAttention(nn.Module):
    def __init__(self, embed_dim):
        super().__init__()
        self.embed_dim = embed_dim

        # Query, Key, Value projections
        self.query = nn.Linear(embed_dim, embed_dim)
        self.key = nn.Linear(embed_dim, embed_dim)
        self.value = nn.Linear(embed_dim, embed_dim)

    def forward(self, x):
        # x: (batch, seq_len, embed_dim)

        # Create Q, K, V
        Q = self.query(x)  # (batch, seq_len, embed_dim)
        K = self.key(x)
        V = self.value(x)

        # Compute attention scores
        scores = torch.matmul(Q, K.transpose(-2, -1))  # (batch, seq_len, seq_len)
        scores = scores / (self.embed_dim ** 0.5)  # Scale

        # Softmax to get attention weights
        attn_weights = F.softmax(scores, dim=-1)

        # Apply attention to values
        output = torch.matmul(attn_weights, V)  # (batch, seq_len, embed_dim)

        return output, attn_weights

# Example
embed_dim = 512
seq_len = 10
batch = 2

x = torch.randn(batch, seq_len, embed_dim)
attn = SelfAttention(embed_dim)
output, weights = attn(x)

print(output.shape)   # torch.Size([2, 10, 512])
print(weights.shape)  # torch.Size([2, 10, 10])
# weights[0, 3, 5] = how much word 3 attends to word 5
```

**Intuition**:
```
Sentence: "The cat sat on the mat"

When processing "sat":
- High attention to "cat" (subject)
- High attention to "mat" (object)
- Low attention to "the"

Attention weights: [0.05, 0.4, 0.1, 0.1, 0.05, 0.3]
```

### Multi-Head Attention

Multiple attention mechanisms in parallel (different aspects of relationships).

```python
class MultiHeadAttention(nn.Module):
    def __init__(self, embed_dim, num_heads):
        super().__init__()
        self.num_heads = num_heads
        self.head_dim = embed_dim // num_heads

        self.qkv = nn.Linear(embed_dim, embed_dim * 3)
        self.fc_out = nn.Linear(embed_dim, embed_dim)

    def forward(self, x):
        batch_size, seq_len, embed_dim = x.shape

        # Generate Q, K, V
        qkv = self.qkv(x)  # (batch, seq_len, embed_dim*3)
        qkv = qkv.reshape(batch_size, seq_len, 3, self.num_heads, self.head_dim)
        qkv = qkv.permute(2, 0, 3, 1, 4)  # (3, batch, heads, seq_len, head_dim)
        q, k, v = qkv[0], qkv[1], qkv[2]

        # Attention
        scores = torch.matmul(q, k.transpose(-2, -1)) / (self.head_dim ** 0.5)
        attn = F.softmax(scores, dim=-1)
        out = torch.matmul(attn, v)

        # Concatenate heads
        out = out.permute(0, 2, 1, 3).reshape(batch_size, seq_len, embed_dim)
        return self.fc_out(out)
```

### Complete Transformer Block

```python
class TransformerBlock(nn.Module):
    def __init__(self, embed_dim, num_heads, ff_dim, dropout=0.1):
        super().__init__()

        # Multi-head attention
        self.attention = nn.MultiheadAttention(embed_dim, num_heads, dropout=dropout)

        # Feed-forward network
        self.ffn = nn.Sequential(
            nn.Linear(embed_dim, ff_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(ff_dim, embed_dim)
        )

        # Layer normalization
        self.ln1 = nn.LayerNorm(embed_dim)
        self.ln2 = nn.LayerNorm(embed_dim)

        self.dropout = nn.Dropout(dropout)

    def forward(self, x):
        # Self-attention with residual connection
        attn_out, _ = self.attention(x, x, x)
        x = self.ln1(x + self.dropout(attn_out))

        # Feed-forward with residual connection
        ffn_out = self.ffn(x)
        x = self.ln2(x + self.dropout(ffn_out))

        return x
```

## BERT (Bidirectional Encoder Representations from Transformers)

Pre-trained on massive text, fine-tune for specific tasks.

### Using BERT for Classification

```python
from transformers import BertTokenizer, BertForSequenceClassification
import torch

# Load pre-trained BERT
model = BertForSequenceClassification.from_pretrained(
    'bert-base-uncased',
    num_labels=2  # Binary classification
)
tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')

# Prepare input
text = "I love this movie!"
inputs = tokenizer(text, return_tensors='pt', padding=True, truncation=True)

# inputs contains:
# - input_ids: Token IDs
# - attention_mask: Which tokens are real (not padding)

# Forward pass
outputs = model(**inputs)
logits = outputs.logits  # (1, 2) - scores for each class

# Get prediction
prediction = torch.argmax(logits, dim=1)
print(prediction)  # tensor([1]) - positive sentiment
```

### Fine-tuning BERT

```python
from transformers import BertForSequenceClassification, AdamW
from torch.utils.data import DataLoader, TensorDataset

# 1. Prepare data
texts = ["I love this!", "This is terrible", ...]
labels = [1, 0, ...]  # 1=positive, 0=negative

# Tokenize
encodings = tokenizer(texts, truncation=True, padding=True, max_length=128)
dataset = TensorDataset(
    torch.tensor(encodings['input_ids']),
    torch.tensor(encodings['attention_mask']),
    torch.tensor(labels)
)
dataloader = DataLoader(dataset, batch_size=16, shuffle=True)

# 2. Setup training
model = BertForSequenceClassification.from_pretrained('bert-base-uncased', num_labels=2)
optimizer = AdamW(model.parameters(), lr=2e-5)  # Small LR for fine-tuning
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model.to(device)

# 3. Train
model.train()
for epoch in range(3):
    for batch in dataloader:
        input_ids, attention_mask, labels = [b.to(device) for b in batch]

        optimizer.zero_grad()

        outputs = model(input_ids, attention_mask=attention_mask, labels=labels)
        loss = outputs.loss  # Computed automatically

        loss.backward()
        optimizer.step()

    print(f'Epoch {epoch+1}, Loss: {loss.item():.4f}')

# 4. Save
model.save_pretrained('./my_bert_model')
tokenizer.save_pretrained('./my_bert_model')
```

## GPT (Generative Pre-trained Transformer)

Autoregressive model: Predicts next token given previous tokens.

### Key Differences: BERT vs GPT

| Feature | BERT | GPT |
|---------|------|-----|
| **Architecture** | Encoder only | Decoder only |
| **Training** | Masked language modeling | Next token prediction |
| **Bidirectional?** | Yes (sees full context) | No (only sees left context) |
| **Best for** | Understanding, classification | Generation, completion |
| **Example models** | BERT, RoBERTa, ALBERT | GPT-3/4, LLaMA, Claude |

### Using GPT for Text Generation

```python
from transformers import GPT2LMHeadModel, GPT2Tokenizer

# Load pre-trained GPT-2
model = GPT2LMHeadModel.from_pretrained('gpt2')
tokenizer = GPT2Tokenizer.from_pretrained('gpt2')

# Generate text
prompt = "Once upon a time"
inputs = tokenizer.encode(prompt, return_tensors='pt')

# Generate
outputs = model.generate(
    inputs,
    max_length=100,
    num_return_sequences=1,
    temperature=0.7,      # Higher = more random
    top_k=50,             # Sample from top 50 tokens
    top_p=0.95,           # Nucleus sampling
    do_sample=True
)

# Decode
generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
print(generated_text)
# "Once upon a time, there was a young girl who lived in a small village..."
```

## Modern NLP: Hugging Face Transformers

Standard library for working with pre-trained models.

### Common Tasks

```python
from transformers import pipeline

# 1. Sentiment Analysis
classifier = pipeline('sentiment-analysis')
result = classifier("I love deep learning!")
# [{'label': 'POSITIVE', 'score': 0.9998}]

# 2. Named Entity Recognition
ner = pipeline('ner', grouped_entities=True)
result = ner("Apple Inc. was founded by Steve Jobs in California.")
# [{'entity_group': 'ORG', 'word': 'Apple Inc.'}, ...]

# 3. Question Answering
qa = pipeline('question-answering')
result = qa(
    question="Who founded Apple?",
    context="Apple Inc. was founded by Steve Jobs in California."
)
# {'answer': 'Steve Jobs', 'score': 0.97, 'start': 28, 'end': 38}

# 4. Translation
translator = pipeline('translation_en_to_fr')
result = translator("Hello, how are you?")
# [{'translation_text': 'Bonjour, comment allez-vous?'}]

# 5. Summarization
summarizer = pipeline('summarization')
long_text = "..." # Long article
result = summarizer(long_text, max_length=130, min_length=30)

# 6. Text Generation
generator = pipeline('text-generation', model='gpt2')
result = generator("The future of AI is", max_length=50)
```

### Fine-tuning for Custom Tasks

```python
from transformers import AutoModelForSequenceClassification, Trainer, TrainingArguments
from datasets import load_dataset

# 1. Load dataset
dataset = load_dataset('imdb')  # Movie reviews

# 2. Tokenize
def tokenize_function(examples):
    return tokenizer(examples['text'], padding='max_length', truncation=True)

tokenized_datasets = dataset.map(tokenize_function, batched=True)

# 3. Model
model = AutoModelForSequenceClassification.from_pretrained('bert-base-uncased', num_labels=2)

# 4. Training arguments
training_args = TrainingArguments(
    output_dir='./results',
    evaluation_strategy='epoch',
    learning_rate=2e-5,
    per_device_train_batch_size=16,
    num_train_epochs=3,
    weight_decay=0.01,
)

# 5. Trainer (handles training loop automatically)
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_datasets['train'],
    eval_dataset=tokenized_datasets['test']
)

# 6. Train
trainer.train()

# 7. Evaluate
metrics = trainer.evaluate()
print(metrics)
```

## Advanced Topics

### 1. Positional Encoding

Transformers need to know word order (unlike RNNs which process sequentially).

```python
import math

def positional_encoding(seq_len, d_model):
    """
    seq_len: Sequence length
    d_model: Embedding dimension
    """
    pos = torch.arange(seq_len).unsqueeze(1)
    div_term = torch.exp(torch.arange(0, d_model, 2) * (-math.log(10000.0) / d_model))

    pe = torch.zeros(seq_len, d_model)
    pe[:, 0::2] = torch.sin(pos * div_term)
    pe[:, 1::2] = torch.cos(pos * div_term)

    return pe

# Add to embeddings
pe = positional_encoding(seq_len=100, d_model=512)
embeddings = word_embeddings + pe
```

### 2. Instruction Tuning (ChatGPT-style)

Fine-tune on instruction-response pairs.

```python
# Training data format
instructions = [
    {
        "instruction": "Translate to French",
        "input": "Hello, how are you?",
        "output": "Bonjour, comment allez-vous?"
    },
    {
        "instruction": "Summarize this text",
        "input": "Long text...",
        "output": "Short summary..."
    }
]

# Format for model
def format_instruction(example):
    prompt = f"Instruction: {example['instruction']}\nInput: {example['input']}\nResponse:"
    return prompt

# Fine-tune model to follow instructions
```

### 3. Retrieval-Augmented Generation (RAG)

Combine retrieval with generation (foundation of modern chatbots).

```python
from transformers import DPRQuestionEncoder, DPRContextEncoder
import faiss

# 1. Encode documents
context_encoder = DPRContextEncoder.from_pretrained('facebook/dpr-ctx_encoder-single-nq-base')
doc_embeddings = context_encoder(documents)

# 2. Build index
index = faiss.IndexFlatIP(768)  # Dimension of embeddings
index.add(doc_embeddings.cpu().numpy())

# 3. Query
question_encoder = DPRQuestionEncoder.from_pretrained('facebook/dpr-question_encoder-single-nq-base')
query_embedding = question_encoder(query)

# 4. Retrieve relevant documents
D, I = index.search(query_embedding.cpu().numpy(), k=5)  # Top 5 docs

# 5. Generate answer using retrieved context
context = " ".join([documents[i] for i in I[0]])
answer = generator(question=query, context=context)
```

## Complete Example: Sentiment Analysis Pipeline

```python
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from torch.utils.data import DataLoader, Dataset

# 1. Custom Dataset
class SentimentDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_len=128):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_len = max_len

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        text = self.texts[idx]
        label = self.labels[idx]

        encoding = self.tokenizer.encode_plus(
            text,
            add_special_tokens=True,
            max_length=self.max_len,
            padding='max_length',
            truncation=True,
            return_tensors='pt'
        )

        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'label': torch.tensor(label, dtype=torch.long)
        }

# 2. Setup
tokenizer = AutoTokenizer.from_pretrained('bert-base-uncased')
model = AutoModelForSequenceClassification.from_pretrained('bert-base-uncased', num_labels=3)

# Data
texts = ["Great movie!", "Terrible experience", "It was okay"]
labels = [2, 0, 1]  # 0=negative, 1=neutral, 2=positive

dataset = SentimentDataset(texts, labels, tokenizer)
dataloader = DataLoader(dataset, batch_size=2)

# 3. Training
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model.to(device)
optimizer = torch.optim.AdamW(model.parameters(), lr=2e-5)

model.train()
for epoch in range(3):
    for batch in dataloader:
        input_ids = batch['input_ids'].to(device)
        attention_mask = batch['attention_mask'].to(device)
        labels = batch['label'].to(device)

        optimizer.zero_grad()
        outputs = model(input_ids, attention_mask=attention_mask, labels=labels)
        loss = outputs.loss
        loss.backward()
        optimizer.step()

# 4. Inference
model.eval()
test_text = "This movie is amazing!"
inputs = tokenizer(test_text, return_tensors='pt', padding=True, truncation=True)
inputs = {k: v.to(device) for k, v in inputs.items()}

with torch.no_grad():
    outputs = model(**inputs)
    prediction = torch.argmax(outputs.logits, dim=1)
    print(f"Predicted sentiment: {prediction.item()}")  # 2 (positive)
```

## Self-Check Questions

> Answer without looking back:

1. What's the main difference between RNNs and Transformers?
2. Explain self-attention in one sentence
3. What's the difference between BERT and GPT?
4. Why do Transformers need positional encoding?
5. What is fine-tuning and when do you use it?
6. What's the purpose of attention masks?

## Practice Exercises

### Level 1: Understand
- Use Hugging Face pipelines for various NLP tasks
- Fine-tune BERT on sentiment analysis
- Experiment with GPT-2 text generation parameters

### Level 2: Apply
- Build a question-answering system with BERT
- Fine-tune a model for custom text classification
- Implement named entity recognition for a specific domain

### Level 3: Create
- Implement Transformer from scratch
- Build a RAG system with document retrieval
- Create a multi-task NLP model (classification + NER)

## Common Mistakes

**Mistake 1: Not using attention masks**
```python
❌ Bad: Ignoring padding tokens
✅ Good: Always pass attention_mask to ignore padding
```

**Mistake 2: Wrong tokenization**
```python
❌ Bad: Using different tokenizer than model was trained with
✅ Good: Use same tokenizer as pre-trained model
```

**Mistake 3: Too high learning rate for fine-tuning**
```python
❌ Bad: lr=1e-3 (destroys pre-trained weights)
✅ Good: lr=2e-5 for fine-tuning
```

## Interview Questions

### Knowledge
1. Explain the attention mechanism
2. How does BERT's training differ from GPT's?
3. What are the advantages of Transformers over RNNs?

### Scenario
1. You need to classify customer reviews. BERT or GPT? Why?
2. Your model needs to generate creative stories. Which architecture?
3. Limited data (100 examples). What approach do you use?

### Debugging
1. BERT fine-tuning results in worse performance than random. Debug.
2. Text generation keeps repeating. How to fix?
3. Out of memory with long documents. Solutions?

## How This Connects

**Prerequisites**:
- `02-neural-networks-deep-dive.md`: RNN, attention basics
- `03-pytorch-fundamentals.md`: Implementation

**Next Steps**:
- `07-ai-agents/`: Build agents using LLMs
- `06-model-deployment.md`: Deploy NLP models

## Summary

Natural Language Processing with deep learning has evolved from RNNs and LSTMs to Transformer-based models like BERT and GPT, which use self-attention to process sequences in parallel and achieve state-of-the-art results across diverse tasks. The Hugging Face Transformers library provides easy access to thousands of pre-trained models that can be fine-tuned for specific tasks with minimal data, making modern NLP accessible to practitioners. Understanding Transformers, attention mechanisms, and pre-training/fine-tuning workflows is essential for building production NLP systems and working with large language models.

## Further Reading

- **CS224n**: Stanford NLP course (free online)
- **Attention Is All You Need**: Original Transformer paper
- **BERT paper**: "BERT: Pre-training of Deep Bidirectional Transformers"
- **Hugging Face Course**: huggingface.co/course (free, excellent)
- **The Illustrated Transformer**: jalammar.github.io
