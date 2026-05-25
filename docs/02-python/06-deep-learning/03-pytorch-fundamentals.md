# PyTorch Fundamentals: From Basics to Production

> **Before you start**: This guide assumes you understand neural network basics (`02-neural-networks-deep-dive.md`) and Python fundamentals. Install PyTorch: `pip install torch torchvision`

## What is PyTorch?

PyTorch is a deep learning framework developed by Meta (Facebook) that provides tools to build, train, and deploy neural networks. Think of it as NumPy with GPU acceleration plus automatic differentiation (automatically computes gradients for backpropagation).

**Simple analogy**: If building neural networks from scratch is like building a car from individual parts, PyTorch is like having pre-built components (engine, transmission) that you assemble.

## Why This Matters

- **Industry standard**: Used by OpenAI, Tesla, Stability AI, and most research labs
- **Research to production**: Same code works for prototyping and deployment
- **Pythonic and intuitive**: Feels natural if you know NumPy
- **Dynamic computation graphs**: Easier debugging, flexible architectures
- **Interview essential**: Most ML job interviews expect PyTorch or TensorFlow knowledge

## PyTorch vs TensorFlow vs JAX

| Feature | PyTorch | TensorFlow | JAX |
|---------|---------|------------|-----|
| **Learning curve** | Easy | Moderate | Hard |
| **Debugging** | Excellent (Pythonic) | Good | Moderate |
| **Production** | Good (TorchServe) | Excellent (TF Serving) | Limited |
| **Research** | Excellent | Good | Excellent |
| **Community** | Large | Very large | Growing |
| **Best for** | Research, prototyping | Production, mobile | High-performance research |

**Recommendation**: Start with PyTorch. It's easier to learn and dominates research.

## Core Concepts

### 1. Tensors (PyTorch's NumPy)

Tensors are multi-dimensional arrays, like NumPy arrays but with GPU support.

```python
import torch
import numpy as np

# Creating tensors
t1 = torch.tensor([1, 2, 3])                    # From list
t2 = torch.zeros(3, 4)                          # Zeros matrix (3x4)
t3 = torch.ones(2, 3, 4)                        # Ones tensor (2x3x4)
t4 = torch.randn(5, 5)                          # Random normal distribution
t5 = torch.arange(0, 10, 2)                     # [0, 2, 4, 6, 8]
t6 = torch.linspace(0, 1, 5)                    # [0, 0.25, 0.5, 0.75, 1]

# From NumPy
np_array = np.array([1, 2, 3])
t7 = torch.from_numpy(np_array)

# To NumPy
back_to_numpy = t7.numpy()

# Tensor attributes
print(t2.shape)        # torch.Size([3, 4])
print(t2.dtype)        # torch.float32
print(t2.device)       # cpu (or cuda if on GPU)
print(t2.requires_grad) # False (more on this later)
```

### 2. Tensor Operations

```python
# Basic operations (similar to NumPy)
a = torch.tensor([1, 2, 3])
b = torch.tensor([4, 5, 6])

# Element-wise operations
c = a + b           # [5, 7, 9]
c = a * b           # [4, 10, 18]
c = a ** 2          # [1, 4, 9]

# Matrix operations
m1 = torch.randn(3, 4)
m2 = torch.randn(4, 5)

result = torch.matmul(m1, m2)  # Matrix multiplication (3x5)
# Or use @ operator
result = m1 @ m2

# Reshaping
x = torch.arange(12)                    # [0, 1, 2, ..., 11]
x = x.view(3, 4)                        # Reshape to 3x4
x = x.reshape(2, 6)                     # Another way to reshape
x = x.transpose(0, 1)                   # Swap dimensions

# Aggregations
x = torch.randn(3, 4)
print(x.mean())                         # Overall mean
print(x.mean(dim=0))                    # Mean across rows
print(x.sum(dim=1))                     # Sum across columns
print(x.max())                          # Maximum value
print(x.argmax())                       # Index of maximum
```

### 3. GPU Acceleration

```python
# Check if GPU is available
print(torch.cuda.is_available())        # True if GPU available
print(torch.cuda.device_count())        # Number of GPUs

# Move tensor to GPU
x = torch.randn(1000, 1000)
x_gpu = x.to('cuda')                    # Move to GPU
# Or
x_gpu = x.cuda()

# Move back to CPU
x_cpu = x_gpu.to('cpu')
# Or
x_cpu = x_gpu.cpu()

# Create directly on GPU
x = torch.randn(1000, 1000, device='cuda')

# Device-agnostic code (best practice)
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
x = torch.randn(1000, 1000, device=device)
```

**Performance difference**:
```python
import time

# CPU
x = torch.randn(5000, 5000)
start = time.time()
result = x @ x
print(f"CPU time: {time.time() - start:.3f}s")  # ~2.5s

# GPU
x = torch.randn(5000, 5000, device='cuda')
start = time.time()
result = x @ x
torch.cuda.synchronize()  # Wait for GPU to finish
print(f"GPU time: {time.time() - start:.3f}s")  # ~0.01s (250x faster!)
```

### 4. Autograd (Automatic Differentiation)

The magic behind backpropagation in PyTorch.

```python
# Enable gradient tracking
x = torch.tensor([2.0], requires_grad=True)
y = torch.tensor([3.0], requires_grad=True)

# Forward pass (define computation)
z = x ** 2 + y ** 3

# Backward pass (compute gradients automatically)
z.backward()

# Access gradients
print(x.grad)  # dz/dx = 2x = 2*2 = 4
print(y.grad)  # dz/dy = 3y^2 = 3*9 = 27

# Neural network example
x = torch.randn(10, requires_grad=True)
w = torch.randn(10, requires_grad=True)

# Forward
output = (x * w).sum()

# Backward
output.backward()

print(x.grad)  # Contains gradients for x
print(w.grad)  # Contains gradients for w

# Reset gradients (important in training loops!)
x.grad.zero_()
w.grad.zero_()
```

**How it works**:
- PyTorch builds a computational graph as you perform operations
- `backward()` traverses this graph in reverse, applying chain rule
- Gradients accumulate by default (must zero them out manually)

## Building Neural Networks

### Method 1: Using nn.Module (Recommended)

```python
import torch.nn as nn

class NeuralNetwork(nn.Module):
    def __init__(self, input_size, hidden_size, num_classes):
        super(NeuralNetwork, self).__init__()

        # Define layers
        self.fc1 = nn.Linear(input_size, hidden_size)  # Fully connected
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(hidden_size, num_classes)

    def forward(self, x):
        """Define forward pass"""
        out = self.fc1(x)       # Linear transformation
        out = self.relu(out)    # Activation
        out = self.fc2(out)     # Output layer
        return out

# Create model
model = NeuralNetwork(input_size=784, hidden_size=128, num_classes=10)

# Check model
print(model)
"""
NeuralNetwork(
  (fc1): Linear(in_features=784, out_features=128, bias=True)
  (relu): ReLU()
  (fc2): Linear(in_features=128, out_features=10, bias=True)
)
"""

# Count parameters
total_params = sum(p.numel() for p in model.parameters())
print(f"Total parameters: {total_params:,}")  # 101,770
```

### Method 2: Using nn.Sequential (For simple models)

```python
model = nn.Sequential(
    nn.Linear(784, 128),
    nn.ReLU(),
    nn.Dropout(0.2),
    nn.Linear(128, 64),
    nn.ReLU(),
    nn.Dropout(0.2),
    nn.Linear(64, 10)
)
```

### Common Layer Types

```python
# 1. Fully connected (Dense)
fc = nn.Linear(in_features=784, out_features=128)

# 2. Convolutional (for images)
conv = nn.Conv2d(in_channels=3, out_channels=64, kernel_size=3, padding=1)

# 3. Pooling
maxpool = nn.MaxPool2d(kernel_size=2, stride=2)
avgpool = nn.AvgPool2d(kernel_size=2)

# 4. Recurrent
rnn = nn.RNN(input_size=100, hidden_size=128, num_layers=2)
lstm = nn.LSTM(input_size=100, hidden_size=128, num_layers=2)
gru = nn.GRU(input_size=100, hidden_size=128, num_layers=2)

# 5. Normalization
batchnorm = nn.BatchNorm1d(128)
layernorm = nn.LayerNorm(128)

# 6. Regularization
dropout = nn.Dropout(p=0.5)

# 7. Activation functions
relu = nn.ReLU()
sigmoid = nn.Sigmoid()
tanh = nn.Tanh()
leaky_relu = nn.LeakyReLU(negative_slope=0.01)
```

## Complete Training Loop

### Setup: Data, Model, Loss, Optimizer

```python
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset

# 1. Prepare data
# Dummy data: 1000 samples, 20 features, 2 classes
X_train = torch.randn(1000, 20)
y_train = torch.randint(0, 2, (1000,))

# Create DataLoader
dataset = TensorDataset(X_train, y_train)
dataloader = DataLoader(dataset, batch_size=32, shuffle=True)

# 2. Define model
class BinaryClassifier(nn.Module):
    def __init__(self):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(20, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(32, 2)  # 2 classes
        )

    def forward(self, x):
        return self.network(x)

model = BinaryClassifier()

# 3. Loss function
criterion = nn.CrossEntropyLoss()

# 4. Optimizer
optimizer = optim.Adam(model.parameters(), lr=0.001)

# Move to GPU if available
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = model.to(device)
```

### Training Loop

```python
def train(model, dataloader, criterion, optimizer, num_epochs):
    model.train()  # Set to training mode (enables dropout, batch norm)

    for epoch in range(num_epochs):
        running_loss = 0.0
        correct = 0
        total = 0

        for inputs, labels in dataloader:
            # Move data to device
            inputs = inputs.to(device)
            labels = labels.to(device)

            # Zero gradients (important!)
            optimizer.zero_grad()

            # Forward pass
            outputs = model(inputs)
            loss = criterion(outputs, labels)

            # Backward pass
            loss.backward()

            # Update weights
            optimizer.step()

            # Track metrics
            running_loss += loss.item()
            _, predicted = torch.max(outputs, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()

        # Epoch statistics
        epoch_loss = running_loss / len(dataloader)
        epoch_acc = 100 * correct / total
        print(f'Epoch [{epoch+1}/{num_epochs}], Loss: {epoch_loss:.4f}, Accuracy: {epoch_acc:.2f}%')

# Train the model
train(model, dataloader, criterion, optimizer, num_epochs=10)
```

### Validation Loop

```python
def validate(model, dataloader, criterion):
    model.eval()  # Set to evaluation mode (disables dropout, batch norm)

    val_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():  # Disable gradient computation (saves memory, faster)
        for inputs, labels in dataloader:
            inputs = inputs.to(device)
            labels = labels.to(device)

            # Forward pass only
            outputs = model(inputs)
            loss = criterion(outputs, labels)

            # Track metrics
            val_loss += loss.item()
            _, predicted = torch.max(outputs, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()

    avg_loss = val_loss / len(dataloader)
    accuracy = 100 * correct / total

    print(f'Validation Loss: {avg_loss:.4f}, Accuracy: {accuracy:.2f}%')
    return avg_loss, accuracy
```

## Working with Real Data: MNIST Example

```python
import torchvision
import torchvision.transforms as transforms

# 1. Load MNIST dataset
transform = transforms.Compose([
    transforms.ToTensor(),  # Convert PIL image to tensor
    transforms.Normalize((0.1307,), (0.3081,))  # Normalize (mean, std)
])

train_dataset = torchvision.datasets.MNIST(
    root='./data',
    train=True,
    download=True,
    transform=transform
)

test_dataset = torchvision.datasets.MNIST(
    root='./data',
    train=False,
    download=True,
    transform=transform
)

# 2. Create DataLoaders
train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True)
test_loader = DataLoader(test_dataset, batch_size=64, shuffle=False)

# 3. Define CNN model
class ConvNet(nn.Module):
    def __init__(self):
        super(ConvNet, self).__init__()
        self.conv1 = nn.Conv2d(1, 32, kernel_size=3, padding=1)
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.pool = nn.MaxPool2d(2, 2)
        self.fc1 = nn.Linear(64 * 7 * 7, 128)
        self.fc2 = nn.Linear(128, 10)
        self.dropout = nn.Dropout(0.25)

    def forward(self, x):
        # Input: (batch, 1, 28, 28)
        x = self.pool(torch.relu(self.conv1(x)))  # (batch, 32, 14, 14)
        x = self.pool(torch.relu(self.conv2(x)))  # (batch, 64, 7, 7)
        x = x.view(-1, 64 * 7 * 7)                # Flatten
        x = self.dropout(torch.relu(self.fc1(x)))
        x = self.fc2(x)
        return x

model = ConvNet().to(device)
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=0.001)

# 4. Train
for epoch in range(5):
    model.train()
    for batch_idx, (data, target) in enumerate(train_loader):
        data, target = data.to(device), target.to(device)

        optimizer.zero_grad()
        output = model(data)
        loss = criterion(output, target)
        loss.backward()
        optimizer.step()

        if batch_idx % 100 == 0:
            print(f'Epoch: {epoch}, Batch: {batch_idx}, Loss: {loss.item():.4f}')

    # Validate
    validate(model, test_loader, criterion)
```

## Saving and Loading Models

```python
# Method 1: Save entire model (not recommended, less portable)
torch.save(model, 'model.pth')
model = torch.load('model.pth')

# Method 2: Save state dict (recommended)
torch.save(model.state_dict(), 'model_weights.pth')

# Load
model = ConvNet()  # Must recreate architecture first
model.load_state_dict(torch.load('model_weights.pth'))
model.eval()  # Set to evaluation mode

# Method 3: Save checkpoint (best for resuming training)
checkpoint = {
    'epoch': epoch,
    'model_state_dict': model.state_dict(),
    'optimizer_state_dict': optimizer.state_dict(),
    'loss': loss,
}
torch.save(checkpoint, 'checkpoint.pth')

# Load checkpoint
checkpoint = torch.load('checkpoint.pth')
model.load_state_dict(checkpoint['model_state_dict'])
optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
epoch = checkpoint['epoch']
loss = checkpoint['loss']
```

## Advanced Techniques

### 1. Learning Rate Scheduling

```python
# Reduce learning rate when loss plateaus
scheduler = optim.lr_scheduler.ReduceLROnPlateau(
    optimizer,
    mode='min',
    factor=0.1,
    patience=5
)

for epoch in range(num_epochs):
    train(...)
    val_loss = validate(...)
    scheduler.step(val_loss)  # Adjust learning rate based on val loss

# Or step decay
scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=10, gamma=0.1)
# Multiplies LR by 0.1 every 10 epochs
```

### 2. Gradient Clipping

```python
# Prevent exploding gradients
max_norm = 1.0
torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm)

# In training loop
optimizer.zero_grad()
loss.backward()
torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm)
optimizer.step()
```

### 3. Mixed Precision Training (Faster, Less Memory)

```python
from torch.cuda.amp import autocast, GradScaler

scaler = GradScaler()

for data, target in dataloader:
    optimizer.zero_grad()

    # Forward pass with autocast
    with autocast():
        output = model(data)
        loss = criterion(output, target)

    # Backward with gradient scaling
    scaler.scale(loss).backward()
    scaler.step(optimizer)
    scaler.update()
```

### 4. Custom Dataset

```python
from torch.utils.data import Dataset

class CustomDataset(Dataset):
    def __init__(self, data, labels, transform=None):
        self.data = data
        self.labels = labels
        self.transform = transform

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        sample = self.data[idx]
        label = self.labels[idx]

        if self.transform:
            sample = self.transform(sample)

        return sample, label

# Usage
dataset = CustomDataset(X, y)
dataloader = DataLoader(dataset, batch_size=32, shuffle=True, num_workers=4)
```

## Common Patterns

### 1. Transfer Learning

```python
import torchvision.models as models

# Load pre-trained ResNet
model = models.resnet50(pretrained=True)

# Freeze all layers
for param in model.parameters():
    param.requires_grad = False

# Replace final layer
num_classes = 10
model.fc = nn.Linear(model.fc.in_features, num_classes)

# Only final layer will be trained
optimizer = optim.Adam(model.fc.parameters(), lr=0.001)
```

### 2. Multi-GPU Training

```python
# Data parallelism (simple way)
if torch.cuda.device_count() > 1:
    model = nn.DataParallel(model)

model = model.to(device)
```

### 3. Early Stopping

```python
class EarlyStopping:
    def __init__(self, patience=5, min_delta=0):
        self.patience = patience
        self.min_delta = min_delta
        self.counter = 0
        self.best_loss = None
        self.early_stop = False

    def __call__(self, val_loss):
        if self.best_loss is None:
            self.best_loss = val_loss
        elif val_loss > self.best_loss - self.min_delta:
            self.counter += 1
            if self.counter >= self.patience:
                self.early_stop = True
        else:
            self.best_loss = val_loss
            self.counter = 0

# Usage
early_stopping = EarlyStopping(patience=5)

for epoch in range(100):
    train(...)
    val_loss = validate(...)
    early_stopping(val_loss)
    if early_stopping.early_stop:
        print("Early stopping triggered")
        break
```

## Debugging Tips

### 1. Check Shapes

```python
def forward(self, x):
    print(f"Input shape: {x.shape}")
    x = self.conv1(x)
    print(f"After conv1: {x.shape}")
    x = self.pool(x)
    print(f"After pool: {x.shape}")
    # ... continue for all layers
```

### 2. Gradient Flow

```python
# Check if gradients are flowing
for name, param in model.named_parameters():
    if param.requires_grad:
        print(f"{name}: grad={param.grad.mean() if param.grad is not None else None}")
```

### 3. Overfitting Test

```python
# Train on a single batch - model should overfit (get 100% accuracy)
single_batch = next(iter(train_loader))
for i in range(100):
    optimizer.zero_grad()
    output = model(single_batch[0])
    loss = criterion(output, single_batch[1])
    loss.backward()
    optimizer.step()
    if i % 10 == 0:
        print(f"Iteration {i}, Loss: {loss.item()}")
# Loss should go to ~0
```

## Self-Check Questions

> Answer without looking back:

1. What's the difference between `tensor.view()` and `tensor.reshape()`?
2. Why do we need `optimizer.zero_grad()`?
3. When should you use `model.train()` vs `model.eval()`?
4. What does `requires_grad=True` do?
5. How do you move a model to GPU?
6. What's the difference between `nn.Module` and `nn.Sequential`?

## Practice Exercises

### Level 1: Understand
- Create tensors, perform operations, move to GPU
- Build a simple 2-layer network using `nn.Sequential`
- Train a model on randomly generated data

### Level 2: Apply
- Implement MNIST classifier from scratch
- Add dropout, batch normalization to your network
- Implement custom dataset for image classification

### Level 3: Create
- Build ResNet from scratch (implement residual connections)
- Implement learning rate warmup scheduler
- Create a training framework with logging, checkpointing, early stopping

## Common Mistakes

**Mistake 1: Forgetting to zero gradients**
```python
❌ Bad:
for data, target in dataloader:
    output = model(data)
    loss = criterion(output, target)
    loss.backward()  # Gradients accumulate!
    optimizer.step()

✅ Good:
optimizer.zero_grad()  # Reset gradients
loss.backward()
optimizer.step()
```

**Mistake 2: Training mode during inference**
```python
❌ Bad: model.train() when evaluating
✅ Good:
model.eval()
with torch.no_grad():
    predictions = model(test_data)
```

**Mistake 3: Wrong device**
```python
❌ Bad: Model on GPU, data on CPU (RuntimeError)
✅ Good:
model = model.to(device)
data = data.to(device)
```

## Interview Questions

### Knowledge
1. Explain the difference between PyTorch and TensorFlow
2. What is autograd and how does it work?
3. Why is PyTorch called "define-by-run"?

### Scenario
1. Your model trains on CPU but crashes on GPU. Why?
2. Training is very slow. What optimizations would you try?
3. How would you implement a custom loss function?

### Debugging
1. "RuntimeError: Expected all tensors to be on the same device" - fix this
2. Validation loss not improving but training loss is - explain
3. GPU memory error during training - what to try?

## How This Connects

**Prerequisites**:
- `02-neural-networks-deep-dive.md`: NN theory, backpropagation

**Next Steps**:
- `04-computer-vision.md`: CNNs in PyTorch
- `05-natural-language-processing.md`: RNNs, Transformers in PyTorch
- `06-model-deployment.md`: TorchServe, ONNX export

## Summary

PyTorch is an intuitive deep learning framework that combines NumPy-like tensor operations with automatic differentiation (autograd) and GPU acceleration, making it the preferred choice for research and increasingly for production. The framework follows a straightforward pattern: define your model as an `nn.Module`, create a loss function and optimizer, then iterate through training loops that zero gradients, perform forward and backward passes, and update weights. Mastering PyTorch's core concepts—tensors, autograd, datasets, and training loops—provides the foundation for building any deep learning application.

## Further Reading

- **Official**: pytorch.org/tutorials
- **Book**: "Deep Learning with PyTorch" by Stevens et al.
- **Video**: PyTorch official YouTube channel
- **Papers with Code**: See PyTorch implementations of research papers
