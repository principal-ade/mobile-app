import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';
import { IndustryMarkdown } from './IndustryMarkdown';

const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: 20,
      }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.backgroundSecondary || theme.colors.background,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radii[2],
          padding: 16,
        }}
      >
        {children}
      </View>
    </View>
  );
};

const meta: Meta<typeof IndustryMarkdown> = {
  title: 'Components/IndustryMarkdown',
  component: IndustryMarkdown,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof IndustryMarkdown>;

// Debug story - Direct Markdown test
export const Debug: Story = {
  render: () => {
    const { theme } = useTheme();

    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: 20 }}>
        <Text style={{ color: theme.colors.text, fontSize: 18, marginBottom: 20, fontWeight: 'bold' }}>
          Expected text color: {theme.colors.text}
        </Text>

        <Text style={{ color: theme.colors.text, fontSize: 16, marginBottom: 30 }}>
          This text should be ice blue. Does it look light blue/cyan to you?
        </Text>

        <Text style={{ color: theme.colors.text, fontSize: 18, marginBottom: 10, fontWeight: 'bold' }}>
          IndustryMarkdown Test:
        </Text>

        <View style={{ backgroundColor: theme.colors.backgroundSecondary, padding: 16, borderRadius: 8, flex: 1 }}>
          <IndustryMarkdown>
            {`This is simple markdown text.

**This is bold text.**

*This is italic text.*

The text should be ice blue (#e8f4f6) on dark background.`}
          </IndustryMarkdown>
        </View>
      </View>
    );
  },
};

// Basic Examples
export const BasicText: Story = {
  render: () => (
    <Frame>
      <IndustryMarkdown>
        {`This is a simple paragraph with **bold** text, *italic* text, and ~~strikethrough~~ text.`}
      </IndustryMarkdown>
    </Frame>
  ),
};

export const Headings: Story = {
  render: () => (
    <Frame>
      <IndustryMarkdown>
        {`# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

Regular paragraph text for comparison.`}
      </IndustryMarkdown>
    </Frame>
  ),
};

export const Lists: Story = {
  render: () => (
    <Frame>
      <IndustryMarkdown>
        {`## Unordered List
- First item
- Second item
- Third item
  - Nested item
  - Another nested item

## Ordered List
1. First step
2. Second step
3. Third step
   1. Substep A
   2. Substep B`}
      </IndustryMarkdown>
    </Frame>
  ),
};

export const CodeBlocks: Story = {
  render: () => (
    <Frame>
      <IndustryMarkdown>
        {`Use \`console.log()\` for debugging.

\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
}

greet('World');
\`\`\`

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
\`\`\`

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const user: User = {
  id: 1,
  name: "John Doe",
  email: "john@example.com"
};
\`\`\``}
      </IndustryMarkdown>
    </Frame>
  ),
};

export const Links: Story = {
  render: () => {
    const [lastClicked, setLastClicked] = React.useState<string | null>(null);
    const { theme } = useTheme();

    return (
      <Frame>
        <View style={{ marginBottom: 16 }}>
          {lastClicked && (
            <Text style={{ color: theme.colors.success || theme.colors.primary, fontSize: 12, marginBottom: 8 }}>
              Last clicked: {lastClicked}
            </Text>
          )}
          <IndustryMarkdown onLinkPress={(url) => setLastClicked(url)}>
            {`Visit [GitHub](https://github.com) or check out [React Native](https://reactnative.dev).

You can also use inline URLs: https://example.com`}
          </IndustryMarkdown>
        </View>
      </Frame>
    );
  },
};

export const Blockquotes: Story = {
  render: () => (
    <Frame>
      <IndustryMarkdown>
        {`> This is a blockquote.
> It can span multiple lines.
>
> And have multiple paragraphs.

> **Note:** You can use *other* markdown \`inside\` blockquotes!`}
      </IndustryMarkdown>
    </Frame>
  ),
};

export const HorizontalRules: Story = {
  render: () => (
    <Frame>
      <IndustryMarkdown>
        {`Section 1

---

Section 2

---

Section 3`}
      </IndustryMarkdown>
    </Frame>
  ),
};

export const Tables: Story = {
  render: () => (
    <Frame>
      <IndustryMarkdown>
        {`| Feature | Status | Priority |
|---------|--------|----------|
| Auth    | ✅ Done | High    |
| Search  | 🚧 WIP  | Medium  |
| Export  | ❌ Todo | Low     |

| Left aligned | Center aligned | Right aligned |
|:-------------|:--------------:|--------------:|
| Left         | Center         | Right         |
| Data         | More data      | Even more     |`}
      </IndustryMarkdown>
    </Frame>
  ),
};

export const MixedContent: Story = {
  render: () => (
    <Frame>
      <IndustryMarkdown>
        {`# React Native Markdown Renderer

A **theme-aware** markdown component with *full* styling support.

## Features

- Industry theme integration
- Code syntax highlighting
- Tables and lists
- Links and images
- Blockquotes

## Installation

\`\`\`bash
npm install react-native-marked
\`\`\`

## Usage

\`\`\`typescript
import { IndustryMarkdown } from './components/IndustryMarkdown';

export default function App() {
  return (
    <IndustryMarkdown>
      # Hello World
      This is **markdown**!
    </IndustryMarkdown>
  );
}
\`\`\`

> **Note:** This component uses the industry-theme system for consistent styling across your app.

---

For more information, visit [the documentation](https://github.com/example/docs).`}
      </IndustryMarkdown>
    </Frame>
  ),
};

export const CodeSnippetShowcase: Story = {
  render: () => (
    <Frame>
      <IndustryMarkdown>
        {`# Code Examples

## JavaScript
\`\`\`javascript
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(3000);
\`\`\`

## TypeScript
\`\`\`typescript
interface Config {
  port: number;
  host: string;
}

const config: Config = {
  port: 3000,
  host: 'localhost'
};
\`\`\`

## Python
\`\`\`python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)
\`\`\`

## JSON
\`\`\`json
{
  "name": "example-app",
  "version": "1.0.0",
  "dependencies": {
    "react": "^19.0.0",
    "react-native": "^0.83.0"
  }
}
\`\`\`

## Shell
\`\`\`bash
#!/bin/bash
echo "Building project..."
npm install
npm run build
echo "Done!"
\`\`\``}
      </IndustryMarkdown>
    </Frame>
  ),
};

export const GitHubStyleReadme: Story = {
  render: () => (
    <Frame>
      <IndustryMarkdown>
        {`# 🚀 Project Name

> A brief description of your project

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#)
[![License](https://img.shields.io/badge/license-MIT-blue)](#)

## 📖 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

- **Fast** - Optimized for performance
- **Simple** - Easy to use API
- **Flexible** - Highly customizable
- **Typed** - Full TypeScript support

## 📦 Installation

\`\`\`bash
npm install your-package
# or
yarn add your-package
\`\`\`

## 🎯 Usage

\`\`\`typescript
import { IndustryMarkdown } from 'your-package';

function App() {
  return (
    <IndustryMarkdown>
      # Hello World
    </IndustryMarkdown>
  );
}
\`\`\`

## 📊 API Reference

### \`IndustryMarkdown\`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| \`children\` | \`string\` | - | Markdown content to render |
| \`onLinkPress\` | \`(url: string) => void\` | - | Link click handler |
| \`customStyles\` | \`Partial<MarkedStyles>\` | \`{}\` | Style overrides |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit your changes (\`git commit -m 'Add some AmazingFeature'\`)
4. Push to the branch (\`git push origin feature/AmazingFeature\`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ by [Your Name](https://github.com/yourusername)`}
      </IndustryMarkdown>
    </Frame>
  ),
};

export const TaskList: Story = {
  render: () => (
    <Frame>
      <IndustryMarkdown>
        {`## Project Tasks

- [x] Set up project
- [x] Install dependencies
- [ ] Write documentation
- [ ] Add tests
- [ ] Deploy to production

## Features

- [x] Markdown rendering
- [x] Code highlighting
- [x] Theme integration
- [ ] Mermaid diagrams
- [ ] LaTeX support`}
      </IndustryMarkdown>
    </Frame>
  ),
};

export const LongDocument: Story = {
  render: () => (
    <Frame>
      <IndustryMarkdown>
        {`# Long Document Example

## Introduction

This is a long document to test scrolling and performance.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

## Section 1: Getting Started

### Prerequisites

- Node.js 18+
- React Native 0.70+
- Basic understanding of markdown

\`\`\`bash
npm install -g expo-cli
\`\`\`

### Installation Steps

1. Clone the repository
2. Install dependencies
3. Run the development server

\`\`\`bash
git clone https://github.com/example/repo.git
cd repo
npm install
npm start
\`\`\`

## Section 2: Configuration

Configure your application by editing \`app.config.js\`:

\`\`\`javascript
module.exports = {
  name: 'My App',
  version: '1.0.0',
  extra: {
    apiKey: process.env.API_KEY,
  },
};
\`\`\`

> **Warning:** Never commit sensitive data to version control.

## Section 3: Usage Examples

### Basic Example

\`\`\`typescript
import React from 'react';
import { View, Text } from 'react-native';

export default function App() {
  return (
    <View>
      <Text>Hello World</Text>
    </View>
  );
}
\`\`\`

### Advanced Example

\`\`\`typescript
import React, { useState, useEffect } from 'react';
import { View, Text, Button } from 'react-native';

export default function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log('Count changed:', count);
  }, [count]);

  return (
    <View>
      <Text>Count: {count}</Text>
      <Button title="Increment" onPress={() => setCount(count + 1)} />
    </View>
  );
}
\`\`\`

## Section 4: API Reference

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| \`render()\` | \`content: string\` | \`ReactNode\` | Renders markdown content |
| \`parse()\` | \`markdown: string\` | \`AST\` | Parses markdown to AST |
| \`stringify()\` | \`ast: AST\` | \`string\` | Converts AST to markdown |

## Section 5: Best Practices

1. **Keep it simple** - Don't over-complicate your markdown
2. **Use semantic headings** - H1 for titles, H2 for sections, etc.
3. **Code blocks** - Always specify the language for syntax highlighting
4. **Links** - Use descriptive link text

---

## Conclusion

This component provides a powerful and flexible way to render markdown in React Native applications.

For more information, visit the [documentation](https://example.com).`}
      </IndustryMarkdown>
    </Frame>
  ),
};
