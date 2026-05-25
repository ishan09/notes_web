# Data Visualization with Matplotlib: Zero to Advanced

> **Before you start**: Basic Python knowledge (`01-fundamentals/`) and NumPy basics (`01-numpy-basics.md`). Install matplotlib: `pip install matplotlib`

## What is Matplotlib?

Matplotlib is Python's most popular plotting library, used to create static, animated, and interactive visualizations. It's the foundation for most Python data visualization—think of it as the "photoshop" of data plots, giving you complete control over every element.

**Simple analogy**: If data is a story, matplotlib is your illustrator. Excel gives you basic sketches; matplotlib is a professional artist with unlimited creative tools.

## Why This Matters

- **Industry standard**: Used by scientists, engineers, data analysts, ML practitioners worldwide
- **Foundation library**: Seaborn, Pandas plotting, and many others build on top of matplotlib
- **Publication-quality**: Create plots for papers, reports, presentations with precise control
- **Interview essential**: Data science interviews often require creating visualizations on the spot
- **ML critical**: Visualizing training loss, confusion matrices, model performance, data exploration

## Installation and Setup

```python
# Install
pip install matplotlib

# Import (standard convention)
import matplotlib.pyplot as plt
import numpy as np

# Optional: For Jupyter notebooks (inline plots)
%matplotlib inline

# High-DPI displays (retina)
%config InlineBackend.figure_format = 'retina'
```

## Core Architecture: Figure and Axes

**The matplotlib hierarchy**:
```
Figure (entire window)
  └── Axes (the plot area where data is shown)
        ├── X-axis
        ├── Y-axis
        ├── Title
        ├── Legend
        └── Plot elements (lines, markers, etc.)
```

### Understanding Figure vs Axes

```python
import matplotlib.pyplot as plt

# Method 1: Implicit (pyplot interface) - Good for quick plots
plt.plot([1, 2, 3, 4], [1, 4, 9, 16])
plt.ylabel('Y values')
plt.show()

# Method 2: Explicit (OOP interface) - RECOMMENDED for control
fig, ax = plt.subplots()  # Create figure and axes
ax.plot([1, 2, 3, 4], [1, 4, 9, 16])
ax.set_ylabel('Y values')
plt.show()

# Think of it this way:
# fig = The canvas/paper
# ax = The drawing area on the canvas
```

**Best practice**: Use the explicit `fig, ax = plt.subplots()` approach for better control and clarity.

## Level 1: Basic Plots (Zero to Hero)

### 1. Line Plot

```python
import matplotlib.pyplot as plt
import numpy as np

# Create data
x = np.linspace(0, 10, 100)  # 100 points from 0 to 10
y = np.sin(x)

# Create plot
fig, ax = plt.subplots(figsize=(10, 6))  # Figure size in inches
ax.plot(x, y)

# Labels and title
ax.set_xlabel('X axis')
ax.set_ylabel('Y axis')
ax.set_title('Simple Sine Wave')

# Grid
ax.grid(True, alpha=0.3)  # alpha controls transparency

plt.show()
```

### 2. Multiple Lines

```python
x = np.linspace(0, 10, 100)

fig, ax = plt.subplots(figsize=(10, 6))

# Multiple plots on same axes
ax.plot(x, np.sin(x), label='sin(x)')
ax.plot(x, np.cos(x), label='cos(x)')
ax.plot(x, np.sin(x) * np.cos(x), label='sin(x) * cos(x)')

ax.set_xlabel('X')
ax.set_ylabel('Y')
ax.set_title('Trigonometric Functions')
ax.legend()  # Show legend
ax.grid(True, alpha=0.3)

plt.show()
```

### 3. Scatter Plot

```python
# Generate random data
np.random.seed(42)
x = np.random.randn(100)
y = 2 * x + np.random.randn(100) * 0.5

fig, ax = plt.subplots(figsize=(8, 6))

ax.scatter(x, y, alpha=0.6, s=50)  # s = marker size
ax.set_xlabel('X values')
ax.set_ylabel('Y values')
ax.set_title('Scatter Plot Example')
ax.grid(True, alpha=0.3)

plt.show()
```

### 4. Bar Chart

```python
categories = ['A', 'B', 'C', 'D', 'E']
values = [23, 45, 56, 78, 32]

fig, ax = plt.subplots(figsize=(8, 6))

ax.bar(categories, values, color='steelblue', alpha=0.7)
ax.set_xlabel('Categories')
ax.set_ylabel('Values')
ax.set_title('Bar Chart Example')

# Add value labels on top of bars
for i, v in enumerate(values):
    ax.text(i, v + 1, str(v), ha='center', va='bottom')

plt.show()
```

### 5. Histogram

```python
# Generate random data
data = np.random.randn(1000)

fig, ax = plt.subplots(figsize=(10, 6))

ax.hist(data, bins=30, color='skyblue', edgecolor='black', alpha=0.7)
ax.set_xlabel('Value')
ax.set_ylabel('Frequency')
ax.set_title('Histogram of Random Data')
ax.grid(True, alpha=0.3, axis='y')

plt.show()
```

## Level 2: Customization

### Colors and Styles

```python
x = np.linspace(0, 10, 100)

fig, ax = plt.subplots(figsize=(10, 6))

# Different ways to specify colors
ax.plot(x, np.sin(x), color='red', label='Red')
ax.plot(x, np.sin(x) + 1, color='#FF5733', label='Hex color')
ax.plot(x, np.sin(x) + 2, color=(0.1, 0.5, 0.8), label='RGB tuple')
ax.plot(x, np.sin(x) + 3, color='C0', label='Color cycle')

ax.legend()
plt.show()
```

### Line Styles and Markers

```python
x = np.linspace(0, 10, 20)

fig, ax = plt.subplots(figsize=(12, 6))

# Line styles
ax.plot(x, x, '-', label='solid')
ax.plot(x, x + 1, '--', label='dashed')
ax.plot(x, x + 2, '-.', label='dashdot')
ax.plot(x, x + 3, ':', label='dotted')

# Markers
ax.plot(x, x + 5, 'o-', label='circle markers')
ax.plot(x, x + 6, 's-', label='square markers')
ax.plot(x, x + 7, '^-', label='triangle markers')
ax.plot(x, x + 8, 'D-', label='diamond markers')

# Combined style string: [marker][line][color]
ax.plot(x, x + 10, 'ro--', label='red dashed with circles')

ax.legend()
ax.grid(True, alpha=0.3)
plt.show()
```

### Marker Customization

```python
x = np.linspace(0, 10, 20)
y = np.sin(x)

fig, ax = plt.subplots(figsize=(10, 6))

ax.plot(x, y,
        marker='o',           # Marker style
        markersize=10,        # Marker size
        markerfacecolor='red', # Fill color
        markeredgecolor='black', # Edge color
        markeredgewidth=2,    # Edge width
        linestyle='-',        # Line style
        linewidth=2,          # Line width
        color='blue',         # Line color
        alpha=0.7,            # Transparency
        label='Custom styling')

ax.legend()
ax.grid(True, alpha=0.3)
plt.show()
```

### Text and Annotations

```python
x = np.linspace(0, 10, 100)
y = np.sin(x)

fig, ax = plt.subplots(figsize=(12, 6))
ax.plot(x, y, 'b-', linewidth=2)

# Add text at specific position
ax.text(5, 0.5, 'This is text', fontsize=12, color='red')

# Annotate a point
max_idx = np.argmax(y)
ax.annotate('Maximum',
            xy=(x[max_idx], y[max_idx]),  # Point to annotate
            xytext=(x[max_idx] + 1, y[max_idx] - 0.3),  # Text position
            arrowprops=dict(arrowstyle='->', color='red', lw=2),
            fontsize=12,
            color='red')

ax.set_title('Annotations Example')
ax.grid(True, alpha=0.3)
plt.show()
```

## Level 3: Multiple Subplots

### Basic Subplots

```python
fig, axes = plt.subplots(2, 2, figsize=(12, 10))  # 2x2 grid

# axes is a 2D array: axes[row, col]
x = np.linspace(0, 10, 100)

# Top-left
axes[0, 0].plot(x, np.sin(x))
axes[0, 0].set_title('Sine')

# Top-right
axes[0, 1].plot(x, np.cos(x), 'r')
axes[0, 1].set_title('Cosine')

# Bottom-left
axes[1, 0].plot(x, np.tan(x))
axes[1, 0].set_title('Tangent')
axes[1, 0].set_ylim(-5, 5)  # Limit y-axis

# Bottom-right
axes[1, 1].plot(x, np.exp(-x/5))
axes[1, 1].set_title('Exponential Decay')

# Overall title
fig.suptitle('Subplots Example', fontsize=16)

# Adjust spacing
plt.tight_layout()
plt.show()
```

### Flattened Access (Easier for loops)

```python
fig, axes = plt.subplots(2, 3, figsize=(15, 8))
axes = axes.flatten()  # Convert 2D to 1D array

x = np.linspace(0, 10, 100)
functions = [
    (np.sin, 'sin(x)'),
    (np.cos, 'cos(x)'),
    (np.tan, 'tan(x)'),
    (lambda x: x, 'x'),
    (lambda x: x**2, 'x²'),
    (lambda x: np.sqrt(x), '√x')
]

for ax, (func, label) in zip(axes, functions):
    ax.plot(x, func(x))
    ax.set_title(label)
    ax.grid(True, alpha=0.3)

plt.tight_layout()
plt.show()
```

### Custom Subplot Layouts

```python
# Using subplot2grid for complex layouts
fig = plt.figure(figsize=(12, 8))

# Arguments: (grid_shape, location, rowspan, colspan)
ax1 = plt.subplot2grid((3, 3), (0, 0), colspan=3)  # Top row, spans all columns
ax2 = plt.subplot2grid((3, 3), (1, 0), colspan=2)  # Middle row, spans 2 columns
ax3 = plt.subplot2grid((3, 3), (1, 2), rowspan=2)  # Right side, spans 2 rows
ax4 = plt.subplot2grid((3, 3), (2, 0))             # Bottom left
ax5 = plt.subplot2grid((3, 3), (2, 1))             # Bottom middle

x = np.linspace(0, 10, 100)

ax1.plot(x, np.sin(x))
ax1.set_title('Main Plot (spans top)')

ax2.plot(x, np.cos(x))
ax2.set_title('Wide Plot')

ax3.plot(x, np.tan(x))
ax3.set_title('Tall Plot')
ax3.set_ylim(-5, 5)

ax4.plot(x, x)
ax5.plot(x, x**2)

plt.tight_layout()
plt.show()
```

## Level 4: Different Plot Types

### Box Plot

```python
# Generate data for different groups
data = [np.random.normal(100, 10, 200),
        np.random.normal(90, 20, 200),
        np.random.normal(80, 15, 200),
        np.random.normal(70, 10, 200)]

fig, ax = plt.subplots(figsize=(10, 6))

bp = ax.boxplot(data,
                labels=['Group A', 'Group B', 'Group C', 'Group D'],
                patch_artist=True,  # Fill with color
                notch=True,         # Notched boxes
                showmeans=True)     # Show mean as well as median

# Customize colors
colors = ['lightblue', 'lightgreen', 'pink', 'lightyellow']
for patch, color in zip(bp['boxes'], colors):
    patch.set_facecolor(color)

ax.set_ylabel('Values')
ax.set_title('Box Plot Comparison')
ax.grid(True, alpha=0.3, axis='y')

plt.show()
```

### Violin Plot

```python
fig, ax = plt.subplots(figsize=(10, 6))

parts = ax.violinplot(data,
                      positions=[1, 2, 3, 4],
                      showmeans=True,
                      showmedians=True)

ax.set_xticks([1, 2, 3, 4])
ax.set_xticklabels(['Group A', 'Group B', 'Group C', 'Group D'])
ax.set_ylabel('Values')
ax.set_title('Violin Plot')
ax.grid(True, alpha=0.3, axis='y')

plt.show()
```

### Heatmap

```python
# Create 2D data
data = np.random.rand(10, 10)

fig, ax = plt.subplots(figsize=(10, 8))

im = ax.imshow(data, cmap='viridis', aspect='auto')

# Add colorbar
cbar = plt.colorbar(im, ax=ax)
cbar.set_label('Values', rotation=270, labelpad=15)

# Add labels
ax.set_xticks(np.arange(10))
ax.set_yticks(np.arange(10))
ax.set_xticklabels([f'Col {i}' for i in range(10)])
ax.set_yticklabels([f'Row {i}' for i in range(10)])

# Rotate x labels
plt.setp(ax.get_xticklabels(), rotation=45, ha='right')

ax.set_title('Heatmap Example')

plt.tight_layout()
plt.show()
```

### Contour Plot

```python
# Create mesh grid
x = np.linspace(-5, 5, 100)
y = np.linspace(-5, 5, 100)
X, Y = np.meshgrid(x, y)
Z = np.sin(np.sqrt(X**2 + Y**2))

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

# Filled contour
contourf = ax1.contourf(X, Y, Z, levels=20, cmap='RdBu_r')
ax1.set_title('Filled Contour Plot')
plt.colorbar(contourf, ax=ax1)

# Line contour with labels
contour = ax2.contour(X, Y, Z, levels=10, colors='black', linewidths=1)
ax2.clabel(contour, inline=True, fontsize=8)
ax2.set_title('Contour Lines with Labels')

plt.tight_layout()
plt.show()
```

### 3D Plots

```python
from mpl_toolkits.mplot3d import Axes3D

# Create data
x = np.linspace(-5, 5, 50)
y = np.linspace(-5, 5, 50)
X, Y = np.meshgrid(x, y)
Z = np.sin(np.sqrt(X**2 + Y**2))

fig = plt.figure(figsize=(12, 5))

# 3D Surface plot
ax1 = fig.add_subplot(121, projection='3d')
surf = ax1.plot_surface(X, Y, Z, cmap='viridis', alpha=0.8)
ax1.set_title('3D Surface')
fig.colorbar(surf, ax=ax1, shrink=0.5)

# 3D Wireframe
ax2 = fig.add_subplot(122, projection='3d')
ax2.plot_wireframe(X, Y, Z, color='blue', alpha=0.5)
ax2.set_title('3D Wireframe')

plt.tight_layout()
plt.show()
```

### Pie Chart

```python
sizes = [30, 25, 20, 15, 10]
labels = ['Category A', 'Category B', 'Category C', 'Category D', 'Category E']
colors = ['#ff9999', '#66b3ff', '#99ff99', '#ffcc99', '#ff99cc']
explode = (0.1, 0, 0, 0, 0)  # Explode 1st slice

fig, ax = plt.subplots(figsize=(10, 8))

wedges, texts, autotexts = ax.pie(sizes,
                                    explode=explode,
                                    labels=labels,
                                    colors=colors,
                                    autopct='%1.1f%%',
                                    startangle=90,
                                    shadow=True)

# Make percentage text bold
for autotext in autotexts:
    autotext.set_color('white')
    autotext.set_fontweight('bold')

ax.set_title('Pie Chart Example')
plt.show()
```

## Level 5: Advanced Styling

### Matplotlib Styles

```python
# See available styles
print(plt.style.available)
# ['seaborn-v0_8', 'ggplot', 'dark_background', 'bmh', 'fivethirtyeight', ...]

# Use a style
plt.style.use('seaborn-v0_8')  # Or 'ggplot', 'fivethirtyeight', etc.

x = np.linspace(0, 10, 100)

fig, ax = plt.subplots(figsize=(10, 6))
ax.plot(x, np.sin(x), label='sin(x)')
ax.plot(x, np.cos(x), label='cos(x)')
ax.legend()
ax.set_title('Plot with seaborn style')

plt.show()

# Reset to default
plt.style.use('default')
```

### Custom Style Context

```python
# Temporarily use a style
with plt.style.context('dark_background'):
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.plot(x, np.sin(x))
    ax.set_title('Dark background style')
    plt.show()

# Back to previous style after the 'with' block
```

### Custom Colors and Themes

```python
# Define custom color palette
colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8']

fig, ax = plt.subplots(figsize=(10, 6))

for i, color in enumerate(colors):
    ax.plot(x, np.sin(x + i*0.5), color=color, linewidth=2, label=f'Line {i+1}')

ax.legend()
ax.set_facecolor('#F5F5F5')  # Background color
fig.patch.set_facecolor('white')  # Figure background

ax.set_title('Custom Color Palette', fontsize=16, fontweight='bold')
ax.grid(True, alpha=0.3)

plt.show()
```

### Publication-Quality Figures

```python
# Set matplotlib parameters for publication
plt.rcParams.update({
    'font.size': 12,
    'font.family': 'serif',
    'font.serif': ['Times New Roman'],
    'axes.labelsize': 14,
    'axes.titlesize': 16,
    'xtick.labelsize': 12,
    'ytick.labelsize': 12,
    'legend.fontsize': 12,
    'figure.titlesize': 16,
    'lines.linewidth': 2,
    'lines.markersize': 8,
    'figure.figsize': (8, 6),
    'figure.dpi': 300,  # High resolution
    'savefig.dpi': 300,
    'savefig.bbox': 'tight',
    'axes.grid': True,
    'grid.alpha': 0.3
})

fig, ax = plt.subplots()
ax.plot(x, np.sin(x), label='Sine wave')
ax.set_xlabel('X axis')
ax.set_ylabel('Y axis')
ax.set_title('Publication Quality Figure')
ax.legend()

# Save with high quality
plt.savefig('publication_figure.png', dpi=300, bbox_inches='tight')
plt.show()

# Reset to defaults
plt.rcParams.update(plt.rcParamsDefault)
```

## Level 6: Real-World Examples

### 1. Machine Learning: Training History

```python
# Simulate training data
epochs = np.arange(1, 101)
train_loss = 2.5 * np.exp(-epochs/20) + 0.1 + np.random.normal(0, 0.05, 100)
val_loss = 2.5 * np.exp(-epochs/20) + 0.2 + np.random.normal(0, 0.08, 100)
train_acc = 1 - np.exp(-epochs/15) * 0.9 + np.random.normal(0, 0.02, 100)
val_acc = 1 - np.exp(-epochs/15) * 0.9 + np.random.normal(0, 0.03, 100)

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

# Loss plot
ax1.plot(epochs, train_loss, label='Training Loss', linewidth=2)
ax1.plot(epochs, val_loss, label='Validation Loss', linewidth=2)
ax1.set_xlabel('Epoch')
ax1.set_ylabel('Loss')
ax1.set_title('Model Loss During Training')
ax1.legend()
ax1.grid(True, alpha=0.3)

# Accuracy plot
ax2.plot(epochs, train_acc, label='Training Accuracy', linewidth=2)
ax2.plot(epochs, val_acc, label='Validation Accuracy', linewidth=2)
ax2.set_xlabel('Epoch')
ax2.set_ylabel('Accuracy')
ax2.set_title('Model Accuracy During Training')
ax2.legend()
ax2.grid(True, alpha=0.3)

plt.suptitle('Training History', fontsize=16, y=1.02)
plt.tight_layout()
plt.show()
```

### 2. Confusion Matrix

```python
from sklearn.metrics import confusion_matrix
import seaborn as sns

# Simulate predictions
y_true = np.random.randint(0, 3, 100)
y_pred = y_true.copy()
y_pred[np.random.choice(100, 20, replace=False)] = np.random.randint(0, 3, 20)

cm = confusion_matrix(y_true, y_pred)
classes = ['Class A', 'Class B', 'Class C']

fig, ax = plt.subplots(figsize=(8, 6))

im = ax.imshow(cm, cmap='Blues')

# Add colorbar
cbar = ax.figure.colorbar(im, ax=ax)
cbar.ax.set_ylabel('Count', rotation=-90, va="bottom")

# Set ticks and labels
ax.set_xticks(np.arange(len(classes)))
ax.set_yticks(np.arange(len(classes)))
ax.set_xticklabels(classes)
ax.set_yticklabels(classes)

# Rotate x labels
plt.setp(ax.get_xticklabels(), rotation=45, ha="right", rotation_mode="anchor")

# Add text annotations
for i in range(len(classes)):
    for j in range(len(classes)):
        text = ax.text(j, i, cm[i, j],
                       ha="center", va="center",
                       color="white" if cm[i, j] > cm.max()/2 else "black",
                       fontsize=14, fontweight='bold')

ax.set_title('Confusion Matrix')
ax.set_ylabel('True Label')
ax.set_xlabel('Predicted Label')

plt.tight_layout()
plt.show()
```

### 3. Data Distribution Analysis

```python
# Generate sample data
np.random.seed(42)
data1 = np.random.normal(100, 15, 1000)
data2 = np.random.normal(110, 20, 1000)
data3 = np.random.normal(90, 10, 1000)

fig, axes = plt.subplots(2, 2, figsize=(14, 10))

# Histogram
axes[0, 0].hist([data1, data2, data3], bins=30, alpha=0.6,
                label=['Dataset 1', 'Dataset 2', 'Dataset 3'])
axes[0, 0].set_title('Histograms')
axes[0, 0].legend()
axes[0, 0].grid(True, alpha=0.3, axis='y')

# Box plot
axes[0, 1].boxplot([data1, data2, data3],
                    labels=['Dataset 1', 'Dataset 2', 'Dataset 3'],
                    patch_artist=True)
axes[0, 1].set_title('Box Plots')
axes[0, 1].grid(True, alpha=0.3, axis='y')

# Violin plot
parts = axes[1, 0].violinplot([data1, data2, data3], positions=[1, 2, 3],
                               showmeans=True, showmedians=True)
axes[1, 0].set_xticks([1, 2, 3])
axes[1, 0].set_xticklabels(['Dataset 1', 'Dataset 2', 'Dataset 3'])
axes[1, 0].set_title('Violin Plots')
axes[1, 0].grid(True, alpha=0.3, axis='y')

# KDE plot (using histogram with density)
axes[1, 1].hist(data1, bins=50, density=True, alpha=0.6, label='Dataset 1')
axes[1, 1].hist(data2, bins=50, density=True, alpha=0.6, label='Dataset 2')
axes[1, 1].hist(data3, bins=50, density=True, alpha=0.6, label='Dataset 3')
axes[1, 1].set_title('Density Plot')
axes[1, 1].legend()
axes[1, 1].grid(True, alpha=0.3, axis='y')

plt.suptitle('Data Distribution Analysis', fontsize=16, y=1.00)
plt.tight_layout()
plt.show()
```

### 4. Financial Data Visualization

```python
# Simulate stock price data
days = np.arange(0, 365)
price = 100 + np.cumsum(np.random.randn(365) * 2)
volume = np.random.randint(1000000, 5000000, 365)

# Calculate moving averages
ma_20 = np.convolve(price, np.ones(20)/20, mode='valid')
ma_50 = np.convolve(price, np.ones(50)/50, mode='valid')

fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 10),
                                gridspec_kw={'height_ratios': [3, 1]})

# Price chart
ax1.plot(days, price, label='Price', color='black', linewidth=1.5)
ax1.plot(days[19:], ma_20, label='20-day MA', color='blue', linewidth=2)
ax1.plot(days[49:], ma_50, label='50-day MA', color='red', linewidth=2)
ax1.fill_between(days, price, 100, where=(price > 100),
                  alpha=0.3, color='green', label='Above initial')
ax1.fill_between(days, price, 100, where=(price <= 100),
                  alpha=0.3, color='red', label='Below initial')
ax1.set_ylabel('Price ($)', fontsize=12)
ax1.set_title('Stock Price with Moving Averages', fontsize=14, fontweight='bold')
ax1.legend(loc='upper left')
ax1.grid(True, alpha=0.3)

# Volume chart
colors = ['green' if price[i] > price[i-1] else 'red' for i in range(1, len(price))]
colors.insert(0, 'gray')
ax2.bar(days, volume, color=colors, alpha=0.6)
ax2.set_xlabel('Days', fontsize=12)
ax2.set_ylabel('Volume', fontsize=12)
ax2.set_title('Trading Volume', fontsize=12)
ax2.grid(True, alpha=0.3, axis='y')

plt.tight_layout()
plt.show()
```

## Level 7: Advanced Features

### Interactive Features (Zoom, Pan)

```python
# Enable interactive mode
plt.ion()

fig, ax = plt.subplots(figsize=(10, 6))
x = np.linspace(0, 100, 1000)
y = np.sin(x) + np.random.normal(0, 0.1, 1000)

ax.plot(x, y)
ax.set_title('Interactive Plot - Try zooming and panning')
plt.show()

# Note: In Jupyter, use %matplotlib notebook or %matplotlib widget
```

### Animations

```python
from matplotlib.animation import FuncAnimation

fig, ax = plt.subplots(figsize=(10, 6))

x = np.linspace(0, 2*np.pi, 100)
line, = ax.plot(x, np.sin(x))

ax.set_xlim(0, 2*np.pi)
ax.set_ylim(-1.5, 1.5)
ax.set_title('Animated Sine Wave')
ax.grid(True, alpha=0.3)

def animate(frame):
    line.set_ydata(np.sin(x + frame/10))
    return line,

anim = FuncAnimation(fig, animate, frames=100, interval=50, blit=True)

# Save animation
# anim.save('sine_wave.gif', writer='pillow', fps=20)

plt.show()
```

### Dual Y-Axes

```python
x = np.linspace(0, 10, 100)
y1 = np.sin(x)
y2 = np.exp(x/5)

fig, ax1 = plt.subplots(figsize=(10, 6))

# First y-axis
color = 'tab:blue'
ax1.set_xlabel('X axis')
ax1.set_ylabel('sin(x)', color=color)
ax1.plot(x, y1, color=color, linewidth=2)
ax1.tick_params(axis='y', labelcolor=color)
ax1.grid(True, alpha=0.3)

# Second y-axis
ax2 = ax1.twinx()
color = 'tab:red'
ax2.set_ylabel('exp(x/5)', color=color)
ax2.plot(x, y2, color=color, linewidth=2)
ax2.tick_params(axis='y', labelcolor=color)

fig.suptitle('Dual Y-Axes Example')
plt.tight_layout()
plt.show()
```

### Logarithmic Scales

```python
x = np.logspace(0, 5, 100)  # 10^0 to 10^5
y = x ** 2

fig, axes = plt.subplots(1, 3, figsize=(15, 5))

# Linear scale
axes[0].plot(x, y)
axes[0].set_title('Linear Scale')
axes[0].grid(True, alpha=0.3)

# Log scale (x-axis)
axes[1].semilogx(x, y)
axes[1].set_title('Log X Scale')
axes[1].grid(True, alpha=0.3, which='both')

# Log-log scale
axes[2].loglog(x, y)
axes[2].set_title('Log-Log Scale')
axes[2].grid(True, alpha=0.3, which='both')

plt.tight_layout()
plt.show()
```

### Inset Axes (Zoomed View)

```python
from mpl_toolkits.axes_grid1.inset_locator import inset_axes, mark_inset

fig, ax = plt.subplots(figsize=(10, 6))

x = np.linspace(0, 10, 1000)
y = np.sin(x) * np.exp(-x/10)

ax.plot(x, y, 'b-', linewidth=2)
ax.set_xlabel('X')
ax.set_ylabel('Y')
ax.set_title('Plot with Inset Zoom')
ax.grid(True, alpha=0.3)

# Create inset axes
axins = inset_axes(ax, width="40%", height="40%", loc='upper right')
axins.plot(x, y, 'b-', linewidth=2)

# Set zoomed region
x1, x2, y1, y2 = 1, 2, 0.3, 0.5
axins.set_xlim(x1, x2)
axins.set_ylim(y1, y2)
axins.grid(True, alpha=0.3)

# Draw rectangle showing zoomed region
mark_inset(ax, axins, loc1=2, loc2=4, fc="none", ec="red", linewidth=2)

plt.show()
```

### Fill Between with Conditions

```python
x = np.linspace(0, 10, 100)
y1 = np.sin(x)
y2 = 0.5 * np.sin(x + 0.5)

fig, ax = plt.subplots(figsize=(12, 6))

ax.plot(x, y1, 'b-', label='Line 1', linewidth=2)
ax.plot(x, y2, 'r-', label='Line 2', linewidth=2)

# Fill where line1 > line2
ax.fill_between(x, y1, y2, where=(y1 > y2),
                 alpha=0.3, color='blue', label='Line 1 > Line 2')

# Fill where line2 > line1
ax.fill_between(x, y1, y2, where=(y1 <= y2),
                 alpha=0.3, color='red', label='Line 2 > Line 1')

ax.legend(loc='upper right')
ax.set_title('Conditional Fill Between')
ax.grid(True, alpha=0.3)

plt.show()
```

## Saving Figures

```python
fig, ax = plt.subplots(figsize=(10, 6))
ax.plot(x, np.sin(x))
ax.set_title('Example Plot')

# Save in different formats
plt.savefig('plot.png', dpi=300, bbox_inches='tight')  # PNG
plt.savefig('plot.pdf', bbox_inches='tight')            # PDF (vector)
plt.savefig('plot.svg', bbox_inches='tight')            # SVG (vector)
plt.savefig('plot.jpg', dpi=300, bbox_inches='tight',   # JPEG
            quality=95, facecolor='white')

# Transparent background
plt.savefig('plot_transparent.png', dpi=300,
            bbox_inches='tight', transparent=True)

plt.show()
```

## Common Mistakes and How to Avoid Them

### Mistake 1: Not Using `fig, ax` Pattern

```python
# ❌ Bad: Using pyplot directly (loses control)
plt.plot([1, 2, 3])
plt.title('Title')

# ✅ Good: Explicit figure and axes
fig, ax = plt.subplots()
ax.plot([1, 2, 3])
ax.set_title('Title')
```

### Mistake 2: Forgetting `plt.show()` or `plt.close()`

```python
# ❌ Bad: Figures accumulate in memory
for i in range(100):
    plt.plot([1, 2, 3])
    # Memory leak!

# ✅ Good: Close figures or use context manager
for i in range(100):
    fig, ax = plt.subplots()
    ax.plot([1, 2, 3])
    plt.close(fig)  # Close to free memory
```

### Mistake 3: Poor Color Choices

```python
# ❌ Bad: Rainbow colors (hard to interpret, not colorblind-friendly)
colors = ['red', 'orange', 'yellow', 'green', 'blue']

# ✅ Good: Use perceptually uniform colormaps
from matplotlib import cm
colors = cm.viridis(np.linspace(0, 1, 5))

# Or use colorblind-friendly palettes
colors = ['#377eb8', '#ff7f00', '#4daf4a', '#f781bf', '#a65628']
```

### Mistake 4: Too Many Plot Elements

```python
# ❌ Bad: Cluttered, hard to read
fig, ax = plt.subplots()
for i in range(50):
    ax.plot(x, np.sin(x + i), label=f'Line {i}')
ax.legend()  # Legend is huge!

# ✅ Good: Simplify or use other visualization
# Use heatmap, aggregation, or show only key lines
```

### Mistake 5: Not Setting Figure Size

```python
# ❌ Bad: Default size may be too small
fig, ax = plt.subplots()  # Default is 6.4 x 4.8 inches

# ✅ Good: Set appropriate size
fig, ax = plt.subplots(figsize=(12, 6))  # Width, height in inches
```

### Mistake 6: Ignoring Aspect Ratio

```python
# ❌ Bad: Distorted circles
fig, ax = plt.subplots(figsize=(12, 4))
circle = plt.Circle((0.5, 0.5), 0.3)
ax.add_patch(circle)  # Looks like an ellipse!

# ✅ Good: Set equal aspect
fig, ax = plt.subplots(figsize=(8, 8))
circle = plt.Circle((0.5, 0.5), 0.3)
ax.add_patch(circle)
ax.set_aspect('equal')  # Circle looks like a circle
```

## Self-Check Questions

> Answer from memory before checking

1. **What** is the difference between a Figure and an Axes in matplotlib?
2. **Why** should you use `fig, ax = plt.subplots()` instead of `plt.plot()`?
3. **When** would you use `ax.twinx()` for dual y-axes?
4. **How** do you create a 2x3 grid of subplots?
5. **Compare**: What's the difference between `plot()`, `scatter()`, and `bar()`?
6. **Explain**: How do you save a figure in multiple formats with high resolution?

## Practice Exercises

**Level 1 - Understand**:
1. Create a line plot with custom colors, markers, and line styles
2. Make a bar chart with error bars and value labels
3. Create a 2x2 subplot grid with different plot types
4. Add a legend, title, and axis labels to a plot
5. Save a figure as PNG and PDF

**Level 2 - Apply**:
1. Visualize a dataset's distribution using histogram, box plot, and violin plot
2. Create a training history plot (loss and accuracy over epochs)
3. Make a heatmap with a colorbar and annotations
4. Create a financial candlestick chart with volume bars
5. Build an interactive dashboard with multiple linked subplots

**Level 3 - Create**:
1. Build a publication-ready figure with custom styling and annotations
2. Create an animated plot showing data evolving over time
3. Design a comprehensive data analysis dashboard with 6+ different visualizations
4. Implement a custom color theme and apply it across multiple plots
5. Create a complex multi-panel figure with insets, dual axes, and custom legends

## Advanced Tips and Tricks

### 1. Use Object-Oriented Interface

```python
# Always prefer this pattern
fig, ax = plt.subplots()
ax.plot(x, y)
ax.set_xlabel('X')

# Over this
plt.plot(x, y)
plt.xlabel('X')
```

### 2. Context Managers for Temporary Settings

```python
with plt.rc_context({'font.size': 14, 'lines.linewidth': 3}):
    # Settings apply only here
    fig, ax = plt.subplots()
    ax.plot(x, y)
# Settings revert after this block
```

### 3. Efficient Data Updates

```python
# ✅ Good: Update data, don't recreate
line, = ax.plot(x, y)
for new_y in data_stream:
    line.set_ydata(new_y)
    fig.canvas.draw()
    fig.canvas.flush_events()
```

### 4. Memory Management

```python
# Close figures explicitly
plt.close('all')  # Close all figures
plt.close(fig)    # Close specific figure

# Or use context manager
with plt.ioff():  # Turn off interactive mode
    fig, ax = plt.subplots()
    ax.plot(x, y)
    plt.savefig('output.png')
    plt.close(fig)
```

## How This Connects

**Builds on**:
- `01-numpy-basics.md` - NumPy arrays are the foundation for matplotlib data
- Python fundamentals - Lists, loops, functions for plot customization

**Related concepts**:
- `02-pandas-fundamentals.md` - Pandas has built-in plotting using matplotlib
- Seaborn - High-level interface built on matplotlib
- Plotly - Interactive alternative to matplotlib

**Why this matters for AI/ML**:
- **Data exploration**: Visualize distributions, correlations, outliers
- **Model evaluation**: Plot training curves, confusion matrices, ROC curves
- **Result communication**: Present findings to stakeholders
- **Debugging**: Visualize feature importance, attention weights, embeddings

**Next steps**:
- Learn Seaborn for statistical visualizations
- Explore Plotly for interactive dashboards
- Study domain-specific visualization (network graphs, geospatial)

## Deep Dive Questions (Expert Level)

> **For 12+ years experience**: These questions explore internals, edge cases, and production scenarios

**Internals & Edge Cases**:
1. Explain matplotlib's backend system and when you'd switch from Agg to Qt5Agg
2. How does matplotlib's artist hierarchy work (Figure → Axes → Artist)?
3. What's the difference between `plt.draw()`, `plt.show()`, and `fig.canvas.draw()`?
4. How do you optimize matplotlib for rendering 1M+ data points?
5. Explain the difference between tight_layout() and constrained_layout()

**Production Scenarios**:
1. How would you generate 10,000 plots in a batch job without memory leaks?
2. Design a system to serve matplotlib figures via a web API
3. How do you make matplotlib thread-safe for concurrent plot generation?
4. What strategies would you use to reduce figure file sizes for a report with 100+ plots?
5. How would you profile and optimize slow matplotlib rendering?

**See also**: [EXPERT_LEVEL_QUESTIONS.md](../EXPERT_LEVEL_QUESTIONS.md#03visualization) for comprehensive list

## Summary

**In 3 sentences**:
- Matplotlib is Python's foundational plotting library that provides complete control over every visual element through its Figure/Axes hierarchy, enabling creation of publication-quality static, animated, and interactive visualizations.
- The explicit object-oriented interface (`fig, ax = plt.subplots()`) is preferred over pyplot's implicit interface for better control, supporting diverse plot types (line, scatter, bar, histogram, heatmap, 3D) with extensive customization of colors, styles, annotations, and layouts.
- Mastering matplotlib is essential for data exploration, ML model evaluation, and result communication, serving as the foundation for higher-level libraries like Seaborn and Pandas plotting.

**Key takeaway**: Matplotlib gives you pixel-perfect control over every visual element—use the explicit `fig, ax` pattern, leverage styles for consistency, and always consider your audience when choosing colors and layouts.

## Quick Reference Cheat Sheet

```python
# Basic template
import matplotlib.pyplot as plt
import numpy as np

fig, ax = plt.subplots(figsize=(10, 6))
ax.plot(x, y, 'o-', label='Data')
ax.set_xlabel('X Label')
ax.set_ylabel('Y Label')
ax.set_title('Title')
ax.legend()
ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig('output.png', dpi=300, bbox_inches='tight')
plt.show()

# Common plot types
ax.plot(x, y)                    # Line plot
ax.scatter(x, y)                 # Scatter plot
ax.bar(x, height)                # Bar chart
ax.hist(data, bins=30)           # Histogram
ax.boxplot(data)                 # Box plot
ax.imshow(image, cmap='gray')    # Image/heatmap
ax.contour(X, Y, Z)              # Contour plot

# Customization
ax.set_xlim(0, 10)               # Set x limits
ax.set_ylim(0, 10)               # Set y limits
ax.set_xscale('log')             # Logarithmic scale
ax.legend(loc='best')            # Add legend
ax.grid(True, alpha=0.3)         # Add grid
ax.set_aspect('equal')           # Equal aspect ratio

# Subplots
fig, axes = plt.subplots(2, 2, figsize=(12, 10))
axes[0, 0].plot(x, y)            # Access individual subplot
```
