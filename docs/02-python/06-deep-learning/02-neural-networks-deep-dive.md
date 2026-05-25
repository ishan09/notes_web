# Neural Networks: Architecture & Training Internals

> **Before you start**: This guide assumes you've read `01-deep-learning-end-to-end.md` and understand basic ML concepts (gradient descent, loss functions). You'll need basic calculus (derivatives) and linear algebra (matrix multiplication).

## What is a Neural Network?

A neural network is a computational model inspired by biological neurons in the brain. It's essentially a **mathematical function** composed of layers of interconnected nodes (neurons) that transform input data into output predictions through learned parameters.

**Simple analogy**: Think of it as a factory assembly line where raw materials (input) pass through multiple processing stations (layers), each applying transformations, until you get the final product (output).

## Why This Matters

- **Foundation of deep learning**: Understanding neural networks is crucial for all DL work
- **Interview essential**: "Explain backpropagation" is one of the most common ML interview questions
- **Debugging models**: You can't fix training issues without understanding what's happening inside
- **Architecture design**: Knowing how layers work helps you design better models

## The Building Blocks

### 1. The Neuron (Perceptron)

The fundamental unit of a neural network:

```python
# Mathematical representation of a single neuron
def neuron(inputs, weights, bias):
    """
    inputs: [x1, x2, x3, ...]
    weights: [w1, w2, w3, ...]
    bias: b
    """
    # Step 1: Weighted sum
    z = sum(inputs[i] * weights[i] for i in range(len(inputs))) + bias

    # Step 2: Activation function
    output = activation_function(z)

    return output

# Example
inputs = [1.0, 2.0, 3.0]
weights = [0.5, -0.3, 0.8]
bias = 0.1

z = (1.0 * 0.5) + (2.0 * -0.3) + (3.0 * 0.8) + 0.1  # = 2.0
output = activation_function(z)
```

**What's happening**:
1. Each input is multiplied by a weight (importance factor)
2. All weighted inputs are summed together
3. A bias is added (shifts the decision boundary)
4. An activation function adds non-linearity

### 2. Activation Functions

Activation functions introduce **non-linearity**, allowing networks to learn complex patterns.

```python
import numpy as np

# 1. ReLU (Rectified Linear Unit) - Most common
def relu(x):
    return np.maximum(0, x)
    # Negative values → 0
    # Positive values → unchanged

# 2. Sigmoid - For binary classification output
def sigmoid(x):
    return 1 / (1 + np.exp(-x))
    # Output: 0 to 1 (probability)

# 3. Tanh - For hidden layers
def tanh(x):
    return np.tanh(x)
    # Output: -1 to 1

# 4. Softmax - For multi-class classification
def softmax(x):
    exp_x = np.exp(x - np.max(x))  # Numerical stability
    return exp_x / exp_x.sum()
    # Outputs sum to 1 (probability distribution)
```

| Activation | Use Case | Range | Pros | Cons |
|------------|----------|-------|------|------|
| **ReLU** | Hidden layers | [0, ∞) | Fast, works well | Dead neurons |
| **Sigmoid** | Binary output | (0, 1) | Probabilistic | Vanishing gradient |
| **Tanh** | Hidden layers | (-1, 1) | Zero-centered | Vanishing gradient |
| **Softmax** | Multi-class output | (0, 1), sum=1 | Probability dist | Only for output |

### 3. Layer Types

#### A. Dense (Fully Connected) Layer

Every neuron connects to every neuron in the previous layer.

```python
class DenseLayer:
    def __init__(self, input_size, output_size):
        # Initialize weights: small random values
        self.weights = np.random.randn(input_size, output_size) * 0.01
        self.bias = np.zeros(output_size)

    def forward(self, inputs):
        """
        inputs shape: (batch_size, input_size)
        output shape: (batch_size, output_size)
        """
        # Matrix multiplication + bias
        return np.dot(inputs, self.weights) + self.bias

# Example
layer = DenseLayer(input_size=784, output_size=128)
# 784 inputs (28x28 image flattened)
# 128 output neurons
# Parameters: (784 * 128) + 128 = 100,480 parameters
```

#### B. Convolutional Layer (for images)

Applies filters to detect local patterns (edges, textures).

```python
# Conceptual - actual implementation is more complex
class Conv2D:
    def __init__(self, filters, kernel_size):
        self.filters = filters  # Number of filters
        self.kernel_size = kernel_size  # e.g., (3, 3)
        # Each filter is a small matrix that slides across image

    def forward(self, image):
        # Slides filter across image, computing dot products
        # Detects patterns like edges, corners, textures
        return feature_maps
```

#### C. Recurrent Layer (for sequences)

Maintains hidden state across time steps, used for text, time series.

```python
class RNNCell:
    def forward(self, input_t, hidden_state):
        # Combine current input with previous hidden state
        hidden_state = tanh(
            np.dot(input_t, W_input) +
            np.dot(hidden_state, W_hidden) +
            bias
        )
        return hidden_state
```

## Complete Neural Network Architecture

### Multi-Layer Perceptron (MLP) Example

```python
import numpy as np

class NeuralNetwork:
    def __init__(self):
        # Architecture: 784 → 128 → 64 → 10
        # Input: 28x28 image (784 pixels)
        # Hidden layer 1: 128 neurons
        # Hidden layer 2: 64 neurons
        # Output: 10 classes (digits 0-9)

        # Layer 1
        self.W1 = np.random.randn(784, 128) * 0.01
        self.b1 = np.zeros(128)

        # Layer 2
        self.W2 = np.random.randn(128, 64) * 0.01
        self.b2 = np.zeros(64)

        # Layer 3 (output)
        self.W3 = np.random.randn(64, 10) * 0.01
        self.b3 = np.zeros(10)

    def forward(self, X):
        """Forward pass through the network"""
        # Input layer → Hidden layer 1
        self.z1 = np.dot(X, self.W1) + self.b1
        self.a1 = relu(self.z1)  # Activation

        # Hidden layer 1 → Hidden layer 2
        self.z2 = np.dot(self.a1, self.W2) + self.b2
        self.a2 = relu(self.z2)

        # Hidden layer 2 → Output
        self.z3 = np.dot(self.a2, self.W3) + self.b3
        self.a3 = softmax(self.z3)  # Probabilities

        return self.a3

    def predict(self, X):
        output = self.forward(X)
        return np.argmax(output, axis=1)  # Class with highest probability

# Total parameters
params = (784*128 + 128) + (128*64 + 64) + (64*10 + 10)
print(f"Total parameters: {params:,}")  # 108,938
```

## How Training Works: Backpropagation

Training adjusts weights to minimize prediction error. This happens through **backpropagation** (backward propagation of errors).

### The Training Process

```
1. Forward Pass: Input → Prediction
2. Compute Loss: How wrong is the prediction?
3. Backward Pass: Calculate gradients (how to adjust weights)
4. Update Weights: Adjust parameters to reduce loss
5. Repeat for all data (epoch)
```

### 1. Forward Pass (Detailed)

```python
# Example: Classify image of digit "3"
X = load_image()  # Shape: (784,) - flattened 28x28 image
y_true = 3  # Actual label

# Forward pass
z1 = X @ W1 + b1           # (784,) @ (784, 128) → (128,)
a1 = relu(z1)               # (128,)

z2 = a1 @ W2 + b2          # (128,) @ (128, 64) → (64,)
a2 = relu(z2)               # (64,)

z3 = a2 @ W3 + b3          # (64,) @ (64, 10) → (10,)
predictions = softmax(z3)   # (10,) - probabilities for each digit

# Example output
print(predictions)
# [0.01, 0.02, 0.05, 0.80, 0.03, 0.02, 0.01, 0.03, 0.02, 0.01]
#  0     1     2     3     4     5     6     7     8     9
# Model thinks it's a "3" with 80% confidence - correct!
```

### 2. Loss Calculation

Measures how wrong the prediction is.

```python
# Cross-entropy loss (for classification)
def cross_entropy_loss(predictions, true_label):
    # Only care about probability assigned to true class
    return -np.log(predictions[true_label])

loss = cross_entropy_loss(predictions, y_true=3)
# loss = -log(0.80) = 0.223

# If prediction was wrong
wrong_predictions = [0.05, 0.60, 0.10, 0.02, ...]  # Predicted "1" instead
loss_wrong = -np.log(0.02)  # = 3.91 (much higher loss)
```

### 3. Backward Pass (Backpropagation)

**Goal**: Calculate gradient of loss with respect to each weight (∂Loss/∂Weight)

This tells us: "If I increase this weight by a tiny amount, how much does the loss change?"

```python
# Simplified backpropagation (conceptual)

# Step 1: Output layer gradient
dL_dz3 = predictions.copy()
dL_dz3[y_true] -= 1  # Derivative of cross-entropy + softmax
# Example: [0.01, 0.02, 0.05, -0.20, 0.03, ...] (true class gets -1)

# Step 2: Gradient for W3 and b3
dL_dW3 = np.outer(a2, dL_dz3)  # (64, 10)
dL_db3 = dL_dz3                # (10,)

# Step 3: Backpropagate to hidden layer 2
dL_da2 = dL_dz3 @ W3.T         # Chain rule
dL_dz2 = dL_da2 * relu_derivative(z2)

# Step 4: Gradient for W2 and b2
dL_dW2 = np.outer(a1, dL_dz2)
dL_db2 = dL_dz2

# Step 5: Backpropagate to hidden layer 1
dL_da1 = dL_dz2 @ W2.T
dL_dz1 = dL_da1 * relu_derivative(z1)

# Step 6: Gradient for W1 and b1
dL_dW1 = np.outer(X, dL_dz1)
dL_db1 = dL_dz1
```

**The Chain Rule in Action**:
```
∂Loss/∂W1 = ∂Loss/∂z3 × ∂z3/∂a2 × ∂a2/∂z2 × ∂z2/∂a1 × ∂a1/∂z1 × ∂z1/∂W1
```

### 4. Weight Update

```python
learning_rate = 0.01

# Update all weights
W3 -= learning_rate * dL_dW3
b3 -= learning_rate * dL_db3

W2 -= learning_rate * dL_dW2
b2 -= learning_rate * dL_db2

W1 -= learning_rate * dL_dW1
b1 -= learning_rate * dL_db1
```

**What's happening**: Weights move in the direction that reduces loss.

## Training Algorithm (Complete)

```python
def train(model, X_train, y_train, epochs=10, batch_size=32, lr=0.01):
    n_samples = len(X_train)

    for epoch in range(epochs):
        # Shuffle data each epoch
        indices = np.random.permutation(n_samples)
        X_shuffled = X_train[indices]
        y_shuffled = y_train[indices]

        epoch_loss = 0

        # Mini-batch training
        for i in range(0, n_samples, batch_size):
            # Get batch
            X_batch = X_shuffled[i:i+batch_size]
            y_batch = y_shuffled[i:i+batch_size]

            # Forward pass
            predictions = model.forward(X_batch)

            # Compute loss
            loss = cross_entropy_loss(predictions, y_batch)
            epoch_loss += loss

            # Backward pass
            gradients = model.backward(predictions, y_batch)

            # Update weights
            model.update_weights(gradients, lr)

        # Print progress
        avg_loss = epoch_loss / (n_samples / batch_size)
        print(f"Epoch {epoch+1}/{epochs}, Loss: {avg_loss:.4f}")

# Run training
train(model, X_train, y_train, epochs=10)
```

## Why Backpropagation Works

**Problem**: We have 100,000+ parameters. How do we know which ones to adjust and by how much?

**Solution**: Backpropagation computes the gradient (derivative) for every single parameter efficiently using the chain rule.

**Key insight**:
- Positive gradient → increasing weight increases loss → decrease weight
- Negative gradient → increasing weight decreases loss → increase weight
- Large gradient → weight has big impact → make larger adjustment
- Small gradient → weight has small impact → make smaller adjustment

## Common Architectures

### 1. Feedforward Neural Network (FNN)

```
Input → Dense → ReLU → Dense → ReLU → Dense → Output

Use cases: Tabular data, simple classification
```

### 2. Convolutional Neural Network (CNN)

```
Input Image → Conv → ReLU → Pool → Conv → ReLU → Pool → Flatten → Dense → Output

Use cases: Image classification, object detection
```

### 3. Recurrent Neural Network (RNN)

```
Input Sequence → RNN → RNN → RNN → Output

Use cases: Text generation, time series, translation
```

### 4. Transformer

```
Input → Embedding → Multi-Head Attention → Feed Forward → Output

Use cases: NLP (BERT, GPT), modern vision models (ViT)
```

## Optimization Algorithms

### 1. Stochastic Gradient Descent (SGD)

```python
# Basic weight update
W = W - learning_rate * gradient
```

**Pros**: Simple, proven
**Cons**: Slow convergence, sensitive to learning rate

### 2. SGD with Momentum

```python
# Accumulate velocity
velocity = momentum * velocity - learning_rate * gradient
W = W + velocity
```

**Why it helps**: Smooths updates, accelerates in consistent directions

### 3. Adam (Most Popular)

```python
# Combines momentum + adaptive learning rates
# Automatically adjusts learning rate for each parameter
optimizer = Adam(lr=0.001, beta1=0.9, beta2=0.999)
```

**Why it's popular**: Works well with minimal tuning, converges faster

### Comparison

| Optimizer | Learning Rate Sensitivity | Speed | Best For |
|-----------|---------------------------|-------|----------|
| **SGD** | High | Slow | Needs careful tuning |
| **SGD + Momentum** | Medium | Medium | General use |
| **Adam** | Low | Fast | Default choice for most tasks |
| **AdamW** | Low | Fast | Transformers, modern NLP |

## Regularization Techniques

Prevent overfitting (model memorizing training data).

### 1. Dropout

```python
class Dropout:
    def __init__(self, rate=0.5):
        self.rate = rate  # Probability of dropping a neuron

    def forward(self, inputs, training=True):
        if training:
            # Randomly set neurons to 0
            mask = np.random.binomial(1, 1-self.rate, inputs.shape)
            return inputs * mask / (1 - self.rate)
        else:
            return inputs  # Use all neurons during inference

# Usage
layer = Dense(128)
dropout = Dropout(0.5)

# Training
x = layer.forward(inputs)
x = dropout.forward(x, training=True)  # 50% of neurons set to 0

# Inference
x = layer.forward(inputs)
x = dropout.forward(x, training=False)  # All neurons active
```

**Why it works**: Forces network to learn redundant representations, prevents co-adaptation.

### 2. Batch Normalization

```python
class BatchNorm:
    def forward(self, x):
        # Normalize to mean=0, std=1
        mean = np.mean(x, axis=0)
        std = np.std(x, axis=0)
        x_normalized = (x - mean) / (std + 1e-8)

        # Learnable scale and shift
        return gamma * x_normalized + beta

# Usage: Insert after linear layer, before activation
x = Dense(128)(x)
x = BatchNorm()(x)
x = ReLU()(x)
```

**Benefits**: Faster training, allows higher learning rates, reduces sensitivity to initialization.

### 3. L2 Regularization (Weight Decay)

```python
# Add penalty for large weights to loss function
loss = cross_entropy_loss + lambda_ * sum(W**2)

# In optimizer
W = W - lr * (gradient + lambda_ * W)
```

**Effect**: Encourages smaller weights, smoother decision boundaries.

## Initialization Strategies

Weight initialization matters! Too large or too small causes problems.

```python
# Bad: All zeros
W = np.zeros((input_size, output_size))  # Network won't learn (symmetry)

# Bad: Too large
W = np.random.randn(input_size, output_size) * 10  # Exploding gradients

# Good: Xavier initialization (for tanh, sigmoid)
W = np.random.randn(input_size, output_size) * np.sqrt(1 / input_size)

# Good: He initialization (for ReLU)
W = np.random.randn(input_size, output_size) * np.sqrt(2 / input_size)
```

## Common Training Problems

### 1. Vanishing Gradients

**Problem**: Gradients become very small in early layers, so they don't learn.

**Symptoms**: Early layers' weights barely change, poor performance.

**Solutions**:
- Use ReLU instead of sigmoid/tanh
- Batch normalization
- Residual connections (ResNet)
- Better initialization (He/Xavier)

### 2. Exploding Gradients

**Problem**: Gradients become very large, causing unstable training.

**Symptoms**: Loss becomes NaN, weights blow up.

**Solutions**:
```python
# Gradient clipping
max_norm = 1.0
if gradient_norm > max_norm:
    gradient = gradient * (max_norm / gradient_norm)
```

### 3. Overfitting

**Problem**: Model memorizes training data, fails on new data.

**Symptoms**: Training accuracy high, validation accuracy low.

**Solutions**:
- More training data
- Dropout
- L2 regularization
- Data augmentation
- Reduce model complexity

### 4. Underfitting

**Problem**: Model too simple to capture patterns.

**Symptoms**: Both training and validation accuracy are low.

**Solutions**:
- Increase model capacity (more layers, more neurons)
- Train longer
- Reduce regularization
- Better features/preprocessing

## Self-Check Questions

> Stop and answer these without looking back:

1. What are the three operations a single neuron performs?
2. Why do we need activation functions? What happens without them?
3. Explain backpropagation in one sentence.
4. What's the difference between SGD and Adam optimizers?
5. How does dropout prevent overfitting?
6. What causes vanishing gradients and how do you fix it?

## Practice Exercises

### Level 1: Understand
- Manually calculate forward pass for a 2-layer network with 2 neurons per layer
- Trace backpropagation for a simple example on paper
- Implement a single neuron from scratch in Python

### Level 2: Apply
- Build a neural network from scratch (no frameworks) for MNIST
- Implement backpropagation manually
- Experiment with different activation functions and compare results

### Level 3: Create
- Implement batch normalization from scratch
- Build a custom optimizer (e.g., RMSprop)
- Debug a failing neural network training (provided broken code)

## Common Mistakes

**Mistake 1: Wrong activation function**
```python
❌ Bad: Using sigmoid for hidden layers (vanishing gradients)
✅ Good: Use ReLU for hidden layers, sigmoid/softmax for output
```

**Mistake 2: Not normalizing inputs**
```python
❌ Bad: Feed raw pixel values (0-255) directly
✅ Good: Normalize to [0,1] or [-1,1]
X = X / 255.0
```

**Mistake 3: Learning rate too high/low**
```python
❌ Bad: lr=1.0 (too high, diverges) or lr=1e-10 (too low, no learning)
✅ Good: Start with 1e-3 for Adam, 1e-2 for SGD, use learning rate scheduler
```

**Mistake 4: Forgetting to set model to eval mode**
```python
❌ Bad: model.train() during inference (dropout stays active)
✅ Good:
model.eval()  # Disables dropout, batch norm behaves correctly
with torch.no_grad():  # Saves memory, faster
    predictions = model(X_test)
```

## Interview Questions

### Knowledge Questions
1. Walk me through backpropagation step by step
2. Explain the vanishing gradient problem and how to solve it
3. What's the difference between batch, mini-batch, and stochastic gradient descent?
4. Why do we need non-linear activation functions?

### Scenario Questions
1. Your neural network has 90% training accuracy but 60% validation accuracy. What's wrong?
2. Training loss is stuck at a high value and not decreasing. What would you try?
3. You need to classify 1000 classes with a neural network. What output activation would you use?

### Debugging Questions
1. Training loss becomes NaN after a few iterations. What could cause this?
2. All neurons in a layer output the same value. What's the likely cause?
3. Validation loss starts increasing after epoch 10 while training loss keeps decreasing. Explain.

## How This Connects

**Prerequisites**:
- `01-deep-learning-end-to-end.md`: Understanding of the overall DL workflow
- Basic calculus: Derivatives, chain rule
- Linear algebra: Matrix multiplication, vectors

**Next Steps**:
- `03-pytorch-fundamentals.md`: Implement these concepts in PyTorch
- `04-computer-vision.md`: Apply NNs to images (CNNs)
- `05-natural-language-processing.md`: Apply NNs to text (RNNs, Transformers)

**Related Topics**:
- Optimization theory: Why gradient descent works
- Information theory: Understanding loss functions
- Linear algebra: Matrix operations in neural networks

## Summary

Neural networks are composed of layers of neurons that perform weighted sums followed by non-linear activation functions, transforming inputs into outputs through learned parameters. Training happens via backpropagation, which efficiently computes gradients for all parameters using the chain rule, allowing the optimizer to update weights in the direction that reduces loss. Understanding the internals—from forward passes and loss calculation to backward passes and weight updates—is essential for debugging, designing architectures, and becoming an effective deep learning practitioner.

## Further Reading

- **Books**:
  - "Neural Networks and Deep Learning" by Michael Nielsen (free online)
  - "Deep Learning" by Goodfellow et al., Chapters 6-8

- **Courses**:
  - 3Blue1Brown: Neural Networks series (YouTube, visual explanations)
  - Stanford CS231n: Lectures on backpropagation

- **Interactive**:
  - TensorFlow Playground (playground.tensorflow.org)
  - Neural Network visualization tools

- **Papers**:
  - "Understanding the difficulty of training deep feedforward neural networks" (Glorot & Bengio, 2010)
  - "Batch Normalization" (Ioffe & Szegedy, 2015)
