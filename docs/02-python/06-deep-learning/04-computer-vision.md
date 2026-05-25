# Computer Vision with Deep Learning

> **Before you start**: You should understand neural networks (`02-neural-networks-deep-dive.md`) and PyTorch basics (`03-pytorch-fundamentals.md`). Familiarity with image processing concepts helps but isn't required.

## What is Computer Vision?

Computer vision is the field of teaching computers to "see" and understand visual information from the world—images, videos, and real-time camera feeds. Deep learning has revolutionized this field, achieving human-level (or better) performance on many tasks.

**Simple analogy**: If traditional programming is giving explicit rules ("if pixel is red, it's an apple"), deep learning is showing thousands of apple images and letting the model figure out what makes an apple an apple.

## Why This Matters

- **Ubiquitous applications**: Face recognition, self-driving cars, medical imaging, AR filters
- **High-demand skill**: CV engineers are sought after in robotics, autonomous vehicles, healthcare
- **Research frontier**: New architectures (Vision Transformers) are pushing boundaries
- **Interview staple**: CNN architectures and their trade-offs are common interview topics

## Core Tasks in Computer Vision

| Task | Description | Example | Difficulty |
|------|-------------|---------|------------|
| **Image Classification** | Assign label to entire image | "This is a cat" | Easy |
| **Object Detection** | Find objects and draw boxes | "Cat at (x, y, w, h)" | Medium |
| **Semantic Segmentation** | Label every pixel | "These pixels are cat, these are background" | Hard |
| **Instance Segmentation** | Separate individual objects | "This is cat #1, this is cat #2" | Hard |
| **Image Generation** | Create new images | GANs, Diffusion models | Hard |
| **Face Recognition** | Identify specific person | Unlock phone, security | Medium |
| **Pose Estimation** | Find body keypoints | AR fitness apps | Medium |

## Convolutional Neural Networks (CNNs)

The backbone of computer vision. Unlike fully connected networks, CNNs preserve spatial structure.

### Why CNNs for Images?

**Problem with fully connected layers**:
- Image: 224x224x3 = 150,528 pixels
- First layer with 1000 neurons = 150M parameters!
- Doesn't preserve spatial relationships
- Doesn't handle translation (cat in different positions = different features)

**CNN advantages**:
- **Local connectivity**: Each neuron only looks at small region
- **Parameter sharing**: Same filter applied across entire image
- **Translation invariance**: Detects features regardless of position
- Dramatically fewer parameters

### 1. Convolutional Layer

Applies filters (kernels) to detect patterns.

```python
import torch
import torch.nn as nn

# Single conv layer
conv = nn.Conv2d(
    in_channels=3,      # RGB image
    out_channels=64,    # Number of filters
    kernel_size=3,      # 3x3 filter
    stride=1,           # Move 1 pixel at a time
    padding=1           # Add padding to maintain size
)

# Input: (batch_size, channels, height, width)
x = torch.randn(1, 3, 224, 224)  # Single RGB image
output = conv(x)
print(output.shape)  # torch.Size([1, 64, 224, 224])

# Parameters: (3 * 3 * 3 * 64) + 64 = 1,792
# Much less than fully connected!
```

**What filters detect**:
- **Layer 1**: Low-level features (edges, corners, colors)
- **Layer 2-3**: Mid-level features (textures, patterns)
- **Layer 4+**: High-level features (eyes, wheels, specific objects)

### 2. Pooling Layer

Reduces spatial dimensions, provides translation invariance.

```python
# Max pooling (most common)
maxpool = nn.MaxPool2d(kernel_size=2, stride=2)

x = torch.randn(1, 64, 224, 224)
output = maxpool(x)
print(output.shape)  # torch.Size([1, 64, 112, 112])
# Spatial dimensions halved

# Average pooling
avgpool = nn.AvgPool2d(kernel_size=2, stride=2)
```

**Max pooling example**:
```
Input (4x4):           Output (2x2):
[1  3  2  4]           [3  4]
[5  6  7  8]    -->    [6  8]
[9  2  1  3]
[4  5  6  7]
```
Takes maximum value in each 2x2 region.

### 3. Basic CNN Architecture

```python
class SimpleCNN(nn.Module):
    def __init__(self, num_classes=10):
        super(SimpleCNN, self).__init__()

        # Convolutional layers
        self.features = nn.Sequential(
            # Block 1
            nn.Conv2d(3, 64, kernel_size=3, padding=1),  # 224x224x64
            nn.ReLU(),
            nn.MaxPool2d(2, 2),                          # 112x112x64

            # Block 2
            nn.Conv2d(64, 128, kernel_size=3, padding=1), # 112x112x128
            nn.ReLU(),
            nn.MaxPool2d(2, 2),                           # 56x56x128

            # Block 3
            nn.Conv2d(128, 256, kernel_size=3, padding=1), # 56x56x256
            nn.ReLU(),
            nn.MaxPool2d(2, 2),                            # 28x28x256
        )

        # Classifier
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(256 * 28 * 28, 512),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(512, num_classes)
        )

    def forward(self, x):
        x = self.features(x)
        x = self.classifier(x)
        return x

model = SimpleCNN(num_classes=10)
```

## Classic CNN Architectures

### 1. LeNet-5 (1998) - The Pioneer

First successful CNN, used for digit recognition.

```python
class LeNet5(nn.Module):
    def __init__(self):
        super(LeNet5, self).__init__()
        self.conv1 = nn.Conv2d(1, 6, 5)    # 28x28x1 → 24x24x6
        self.pool = nn.AvgPool2d(2, 2)
        self.conv2 = nn.Conv2d(6, 16, 5)   # 12x12x6 → 8x8x16
        self.fc1 = nn.Linear(16 * 4 * 4, 120)
        self.fc2 = nn.Linear(120, 84)
        self.fc3 = nn.Linear(84, 10)

    def forward(self, x):
        x = self.pool(torch.relu(self.conv1(x)))
        x = self.pool(torch.relu(self.conv2(x)))
        x = x.view(-1, 16 * 4 * 4)
        x = torch.relu(self.fc1(x))
        x = torch.relu(self.fc2(x))
        x = self.fc3(x)
        return x
```

### 2. AlexNet (2012) - The Breakthrough

Won ImageNet 2012, kicked off deep learning revolution.

**Key innovations**:
- Used ReLU (faster than sigmoid/tanh)
- Dropout for regularization
- Data augmentation
- Trained on GPUs

### 3. VGG (2014) - Simplicity Wins

Uses only 3x3 convolutions, very deep (16-19 layers).

```python
class VGG16(nn.Module):
    def __init__(self, num_classes=1000):
        super(VGG16, self).__init__()

        self.features = nn.Sequential(
            # Block 1: 64 filters
            nn.Conv2d(3, 64, 3, padding=1), nn.ReLU(),
            nn.Conv2d(64, 64, 3, padding=1), nn.ReLU(),
            nn.MaxPool2d(2, 2),

            # Block 2: 128 filters
            nn.Conv2d(64, 128, 3, padding=1), nn.ReLU(),
            nn.Conv2d(128, 128, 3, padding=1), nn.ReLU(),
            nn.MaxPool2d(2, 2),

            # Block 3: 256 filters
            nn.Conv2d(128, 256, 3, padding=1), nn.ReLU(),
            nn.Conv2d(256, 256, 3, padding=1), nn.ReLU(),
            nn.Conv2d(256, 256, 3, padding=1), nn.ReLU(),
            nn.MaxPool2d(2, 2),

            # Block 4: 512 filters
            nn.Conv2d(256, 512, 3, padding=1), nn.ReLU(),
            nn.Conv2d(512, 512, 3, padding=1), nn.ReLU(),
            nn.Conv2d(512, 512, 3, padding=1), nn.ReLU(),
            nn.MaxPool2d(2, 2),

            # Block 5: 512 filters
            nn.Conv2d(512, 512, 3, padding=1), nn.ReLU(),
            nn.Conv2d(512, 512, 3, padding=1), nn.ReLU(),
            nn.Conv2d(512, 512, 3, padding=1), nn.ReLU(),
            nn.MaxPool2d(2, 2),
        )

        self.classifier = nn.Sequential(
            nn.Linear(512 * 7 * 7, 4096), nn.ReLU(), nn.Dropout(),
            nn.Linear(4096, 4096), nn.ReLU(), nn.Dropout(),
            nn.Linear(4096, num_classes)
        )

    def forward(self, x):
        x = self.features(x)
        x = x.view(x.size(0), -1)
        x = self.classifier(x)
        return x
```

**Insight**: Two 3x3 convs = one 5x5 conv (same receptive field, fewer parameters).

### 4. ResNet (2015) - The Game Changer

Introduced **residual connections** (skip connections), enabling networks with 50-152+ layers.

**The problem**: Deep networks should work better, but they don't (degradation problem).

**The solution**: Residual blocks

```python
class ResidualBlock(nn.Module):
    def __init__(self, in_channels, out_channels, stride=1):
        super(ResidualBlock, self).__init__()

        self.conv1 = nn.Conv2d(in_channels, out_channels, 3, stride, 1)
        self.bn1 = nn.BatchNorm2d(out_channels)
        self.conv2 = nn.Conv2d(out_channels, out_channels, 3, 1, 1)
        self.bn2 = nn.BatchNorm2d(out_channels)

        # Shortcut connection
        self.shortcut = nn.Sequential()
        if stride != 1 or in_channels != out_channels:
            self.shortcut = nn.Sequential(
                nn.Conv2d(in_channels, out_channels, 1, stride),
                nn.BatchNorm2d(out_channels)
            )

    def forward(self, x):
        identity = x  # Save input

        out = torch.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))

        out += self.shortcut(identity)  # Add skip connection
        out = torch.relu(out)

        return out
```

**Why it works**: Gradients flow directly through skip connections, avoiding vanishing gradient problem.

```
Input (x) ─────────┐
      │            │
   Conv+ReLU       │  (skip connection)
      │            │
   Conv+BN         │
      │            │
      └────(+)─────┘
           │
         ReLU
           │
        Output
```

### 5. Using Pre-trained Models (Transfer Learning)

```python
import torchvision.models as models

# Load pre-trained ResNet50 (trained on ImageNet)
model = models.resnet50(pretrained=True)

# Freeze all layers
for param in model.parameters():
    param.requires_grad = False

# Replace final layer for your task
num_classes = 10  # Your dataset has 10 classes
model.fc = nn.Linear(model.fc.in_features, num_classes)

# Only train the final layer
optimizer = torch.optim.Adam(model.fc.parameters(), lr=0.001)

# Or fine-tune entire model (lower learning rate)
for param in model.parameters():
    param.requires_grad = True

optimizer = torch.optim.Adam([
    {'params': model.fc.parameters(), 'lr': 1e-3},      # New layer: higher LR
    {'params': model.layer4.parameters(), 'lr': 1e-4},  # Last block: medium LR
    {'params': model.layer3.parameters(), 'lr': 1e-5},  # Earlier: lower LR
])
```

## Modern Architectures

### EfficientNet (2019)

Systematically scales depth, width, and resolution for optimal accuracy/efficiency trade-off.

```python
model = models.efficientnet_b0(pretrained=True)  # Smallest
model = models.efficientnet_b7(pretrained=True)  # Largest

# EfficientNet-B0: 5.3M params, 77.1% accuracy
# EfficientNet-B7: 66M params, 84.3% accuracy
```

### Vision Transformer (ViT) (2020)

Applies Transformer architecture (from NLP) to images.

```python
from torchvision.models import vit_b_16

model = vit_b_16(pretrained=True)

# Splits image into patches, treats them like words in a sentence
# Excellent for large datasets, less effective on small datasets
```

## Object Detection

Locate and classify multiple objects in an image.

### YOLO (You Only Look Once)

Fast, real-time object detection.

```python
# Using torchvision (simplified)
import torchvision
from torchvision.models.detection import fasterrcnn_resnet50_fpn

# Load pre-trained Faster R-CNN
model = fasterrcnn_resnet50_fpn(pretrained=True)
model.eval()

# Inference
image = torch.randn(1, 3, 800, 600)  # Example image
predictions = model(image)

# predictions[0] contains:
# - boxes: [[x1, y1, x2, y2], ...]
# - labels: [person, car, dog, ...]
# - scores: [0.99, 0.87, 0.76, ...]

print(predictions[0]['boxes'])   # Bounding boxes
print(predictions[0]['labels'])  # Class IDs
print(predictions[0]['scores'])  # Confidence scores
```

### Common Detection Architectures

| Model | Speed | Accuracy | Use Case |
|-------|-------|----------|----------|
| **YOLO v8** | Very fast | Good | Real-time video |
| **Faster R-CNN** | Slow | Excellent | High-accuracy tasks |
| **SSD** | Fast | Good | Mobile devices |
| **EfficientDet** | Fast | Excellent | Best balance |

## Image Segmentation

### Semantic Segmentation

Label every pixel (all cats are one class).

```python
# U-Net architecture (very popular for segmentation)
class UNet(nn.Module):
    def __init__(self, in_channels=3, num_classes=21):
        super(UNet, self).__init__()

        # Encoder (downsampling)
        self.enc1 = self.conv_block(in_channels, 64)
        self.enc2 = self.conv_block(64, 128)
        self.enc3 = self.conv_block(128, 256)
        self.enc4 = self.conv_block(256, 512)

        self.pool = nn.MaxPool2d(2, 2)

        # Bottleneck
        self.bottleneck = self.conv_block(512, 1024)

        # Decoder (upsampling)
        self.upconv4 = nn.ConvTranspose2d(1024, 512, 2, stride=2)
        self.dec4 = self.conv_block(1024, 512)

        self.upconv3 = nn.ConvTranspose2d(512, 256, 2, stride=2)
        self.dec3 = self.conv_block(512, 256)

        self.upconv2 = nn.ConvTranspose2d(256, 128, 2, stride=2)
        self.dec2 = self.conv_block(256, 128)

        self.upconv1 = nn.ConvTranspose2d(128, 64, 2, stride=2)
        self.dec1 = self.conv_block(128, 64)

        # Final output
        self.out = nn.Conv2d(64, num_classes, 1)

    def conv_block(self, in_ch, out_ch):
        return nn.Sequential(
            nn.Conv2d(in_ch, out_ch, 3, padding=1),
            nn.ReLU(),
            nn.Conv2d(out_ch, out_ch, 3, padding=1),
            nn.ReLU()
        )

    def forward(self, x):
        # Encoder
        e1 = self.enc1(x)
        e2 = self.enc2(self.pool(e1))
        e3 = self.enc3(self.pool(e2))
        e4 = self.enc4(self.pool(e3))

        # Bottleneck
        b = self.bottleneck(self.pool(e4))

        # Decoder with skip connections
        d4 = self.upconv4(b)
        d4 = torch.cat([d4, e4], dim=1)  # Skip connection
        d4 = self.dec4(d4)

        d3 = self.upconv3(d4)
        d3 = torch.cat([d3, e3], dim=1)
        d3 = self.dec3(d3)

        d2 = self.upconv2(d3)
        d2 = torch.cat([d2, e2], dim=1)
        d2 = self.dec2(d2)

        d1 = self.upconv1(d2)
        d1 = torch.cat([d1, e1], dim=1)
        d1 = self.dec1(d1)

        return self.out(d1)
```

### Instance Segmentation

Separate individual objects (cat #1, cat #2).

```python
# Mask R-CNN
from torchvision.models.detection import maskrcnn_resnet50_fpn

model = maskrcnn_resnet50_fpn(pretrained=True)
model.eval()

predictions = model(image)
# predictions[0] contains:
# - boxes, labels, scores (like object detection)
# - masks: Binary masks for each detected object
```

## Data Augmentation

Critical for preventing overfitting and improving generalization.

```python
from torchvision import transforms

# Training augmentations
train_transform = transforms.Compose([
    transforms.Resize(256),
    transforms.RandomCrop(224),                  # Random crop
    transforms.RandomHorizontalFlip(p=0.5),      # 50% chance flip
    transforms.RandomRotation(degrees=15),       # Rotate ±15°
    transforms.ColorJitter(                      # Color variations
        brightness=0.2,
        contrast=0.2,
        saturation=0.2,
        hue=0.1
    ),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

# Validation/Test (no augmentation, only resize+normalize)
val_transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])
```

## Complete Training Example: Image Classification

```python
import torch
import torch.nn as nn
import torchvision
from torchvision import datasets, transforms, models
from torch.utils.data import DataLoader

# 1. Data preparation
transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

train_dataset = datasets.CIFAR10(root='./data', train=True,
                                  download=True, transform=transform)
test_dataset = datasets.CIFAR10(root='./data', train=False,
                                 download=True, transform=transform)

train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True)
test_loader = DataLoader(test_dataset, batch_size=64, shuffle=False)

# 2. Model
model = models.resnet18(pretrained=True)
model.fc = nn.Linear(model.fc.in_features, 10)  # CIFAR-10 has 10 classes

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = model.to(device)

# 3. Loss and optimizer
criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

# 4. Training loop
def train_epoch(model, dataloader, criterion, optimizer):
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    for images, labels in dataloader:
        images, labels = images.to(device), labels.to(device)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        running_loss += loss.item()
        _, predicted = torch.max(outputs, 1)
        total += labels.size(0)
        correct += (predicted == labels).sum().item()

    return running_loss / len(dataloader), 100 * correct / total

# 5. Validation
@torch.no_grad()
def validate(model, dataloader, criterion):
    model.eval()
    val_loss = 0.0
    correct = 0
    total = 0

    for images, labels in dataloader:
        images, labels = images.to(device), labels.to(device)
        outputs = model(images)
        loss = criterion(outputs, labels)

        val_loss += loss.item()
        _, predicted = torch.max(outputs, 1)
        total += labels.size(0)
        correct += (predicted == labels).sum().item()

    return val_loss / len(dataloader), 100 * correct / total

# 6. Train
num_epochs = 10
for epoch in range(num_epochs):
    train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer)
    val_loss, val_acc = validate(model, test_loader, criterion)

    print(f'Epoch {epoch+1}/{num_epochs}')
    print(f'Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.2f}%')
    print(f'Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.2f}%')
```

## Self-Check Questions

> Answer without looking back:

1. Why do CNNs work better than fully connected networks for images?
2. What's the purpose of pooling layers?
3. Explain residual connections in ResNet
4. What's the difference between object detection and segmentation?
5. Why do we use data augmentation?
6. When should you use transfer learning vs training from scratch?

## Practice Exercises

### Level 1: Understand
- Build a simple CNN for MNIST from scratch
- Use a pre-trained ResNet for image classification
- Visualize what different CNN layers detect

### Level 2: Apply
- Fine-tune ResNet on a custom dataset (Kaggle: Dogs vs Cats)
- Implement data augmentation and compare results
- Build an object detector using torchvision

### Level 3: Create
- Implement ResNet from scratch
- Build a U-Net for image segmentation
- Create a real-time object detection app with webcam

## Common Mistakes

**Mistake 1: Wrong input size**
```python
❌ Bad: Feeding 28x28 to ResNet (expects 224x224)
✅ Good: Resize images to match model's expected input
transforms.Resize(224)
```

**Mistake 2: Not normalizing inputs**
```python
❌ Bad: Feed raw pixel values (0-255)
✅ Good: Normalize using ImageNet stats
transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
```

**Mistake 3: Augmenting validation data**
```python
❌ Bad: Using augmentation on test set
✅ Good: Only augment training data
```

## Interview Questions

### Knowledge
1. Explain how convolutional layers work
2. Compare VGG, ResNet, and EfficientNet
3. What's the difference between Faster R-CNN and YOLO?

### Scenario
1. You have only 100 images per class. How do you build a classifier?
2. Your model overfits. What techniques would you try?
3. You need real-time object detection on a phone. Which architecture?

### Debugging
1. Model outputs all zeros. What could be wrong?
2. Validation accuracy stuck at 10% (10 classes). Diagnose this.
3. Out of memory error during training. Solutions?

## How This Connects

**Prerequisites**:
- `02-neural-networks-deep-dive.md`: CNN architecture details
- `03-pytorch-fundamentals.md`: Implementation skills

**Next Steps**:
- `05-natural-language-processing.md`: Similar concepts for text
- `06-model-deployment.md`: Deploy CV models to production

## Summary

Computer vision with deep learning revolves around Convolutional Neural Networks (CNNs), which use convolution and pooling layers to efficiently process images while preserving spatial structure and achieving translation invariance. From classic architectures like VGG and ResNet to modern variants like EfficientNet and Vision Transformers, the field has evolved to solve diverse tasks—classification, object detection, and segmentation—with transfer learning enabling practitioners to leverage pre-trained models for rapid development. Mastering CNNs, data augmentation, and architecture selection is essential for building production-grade computer vision systems.

## Further Reading

- **CS231n**: Stanford's Computer Vision course (free online)
- **Book**: "Deep Learning for Computer Vision" by Rajalingappaa Shanmugamani
- **Papers**: ResNet, EfficientNet, Vision Transformer papers
- **Kaggle**: Image classification competitions for practice
