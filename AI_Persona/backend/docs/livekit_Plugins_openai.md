# LiveKit OpenAI Plugin Documentation

> Documentation for OpenAI LLM integration with LiveKit Agents

## Overview

LiveKit docs › Models › LLM › Plugins › OpenAI

---

# OpenAI LLM plugin guide

> How to use the OpenAI LLM plugin for LiveKit Agents.

Available in:
- [x] Node.js
- [x] Python

## Overview

This plugin allows you to use the [OpenAI platform](https://platform.openai.com/) as an LLM provider for your voice agents.

> 💡 **LiveKit Inference**
> 
> OpenAI models are also available in LiveKit Inference with billing and integration handled automatically. See [the docs](https://docs.livekit.io/agents/models/llm/inference/openai.md) for more information.

> ℹ️ **OpenAI Responses API (Recommended)**
> 
> The OpenAI plugin supports the **Responses API**, which provides support for OpenAI's provider tools (`WebSearch`, `FileSearch`, `CodeInterpreter`) and is the recommended approach for direct OpenAI usage. Use `openai.responses.LLM()` to access the Responses API. The Chat Completions API is available via `openai.LLM()` and is used for OpenAI-compatible endpoints (like `openai.LLM.with_cerebras()`). See [API modes](#api-modes) for more information.

## Quick reference

This section includes a basic usage example and some reference material. For links to more detailed documentation, see [Additional resources](#additional-resources).

### Installation

Install the plugin from PyPI:

**Python**:

```shell
uv add "livekit-agents[openai]~=1.3"

```

---

**Node.js**:

```shell
pnpm add @livekit/agents-plugin-openai@1.x

```

### Authentication

The OpenAI plugin requires an [OpenAI API key](https://platform.openai.com/api-keys).

Set `OPENAI_API_KEY` in your `.env` file.

### Usage

Use OpenAI within an `AgentSession` or as a standalone LLM service. For example, you can use this LLM in the [Voice AI quickstart](https://docs.livekit.io/agents/start/voice-ai.md).

**Python**:

```python
from livekit.plugins import openai

# Use Responses API (recommended)
session = AgentSession(
    llm=openai.responses.LLM(
        model="gpt-4o-mini"
    ),
    # ... tts, stt, vad, turn_detection, etc.
)

```

---

**Node.js**:

```typescript
import * as openai from '@livekit/agents-plugin-openai';

// Use Responses API (recommended)
const session = new voice.AgentSession({
    llm: openai.responses.LLM({
        model: "gpt-4o-mini"
    }),
    // ... tts, stt, vad, turn_detection, etc.
});

```

## API modes

The OpenAI plugin supports two API modes: **Responses API** and **Chat Completions API**.

### Responses API (Recommended)

The Responses API is the recommended mode. It provides:

- Support for OpenAI's provider tools (`WebSearch`, `FileSearch`, `CodeInterpreter`)
- Better performance and features
- Access to the latest OpenAI capabilities
- Lower costs

Use `openai.responses.LLM()` to access the Responses API:

**Python**:

```python
from livekit.plugins import openai

# Use Responses API (recommended)
session = AgentSession(
    llm=openai.responses.LLM(model="gpt-4o-mini"),
    # ... tts, stt, vad, turn_detection, etc.
)

```

---

**Node.js**:

```typescript
import * as openai from '@livekit/agents-plugin-openai';

// Use Responses API (recommended)
const session = new voice.AgentSession({
    llm: openai.responses.LLM({ model: "gpt-4o-mini" }),
    // ... tts, stt, vad, turn_detection, etc.
});

```

### Chat Completions API

The Chat Completions API is available via `openai.LLM()`. This API mode is used for:

- **OpenAI-compatible endpoints**: Providers like Cerebras, Fireworks, Groq, etc. use `openai.LLM.with_*()` methods which rely on the Chat Completions API format (see [OpenAI-compatible endpoints](#openai-compatible-endpoints))
- **Legacy code compatibility**: Existing code that uses `openai.LLM()` directly

> ℹ️ **For direct OpenAI usage**
> 
> For direct OpenAI platform usage, use `openai.responses.LLM()` instead of `openai.LLM()`. The Responses API provides better features and performance.

To use Chat Completions mode directly with OpenAI (not recommended for new projects):

**Python**:

```python
from livekit.plugins import openai

# Chat Completions API (use openai.responses.LLM() for new projects)
session = AgentSession(
    llm=openai.LLM(model="gpt-4o-mini"),
    # ... tts, stt, vad, turn_detection, etc.
)

```

---

**Node.js**:

```typescript
import * as openai from '@livekit/agents-plugin-openai';

// Chat Completions API (use openai.responses.LLM() for new projects)
const session = new voice.AgentSession({
    llm: openai.LLM({ model: "gpt-4o-mini" }),
    // ... tts, stt, vad, turn_detection, etc.
});

```

### OpenAI-compatible endpoints

When using OpenAI-compatible endpoints with providers using Chat Completions mode, you should use `openai.LLM()` with the provider's `with_*()` method. These providers include:

- Cerebras: `openai.LLM.with_cerebras()`
- Fireworks: `openai.LLM.with_fireworks()`
- Groq: `openai.LLM.with_groq()`
- Perplexity: `openai.LLM.with_perplexity()`
- Telnyx: `openai.LLM.with_telnyx()`
- Together AI: `openai.LLM.with_together()`
- xAI: `openai.LLM.with_x_ai()`
- DeepSeek: `openai.LLM.with_deepseek()`

These providers are built on the Chat Completions API format, so they use `openai.LLM()` (not `openai.responses.LLM()`). The `with_*()` methods automatically configure the correct API mode. See the individual provider documentation for specific usage examples.

## Parameters

This section describes some of the available parameters. See the plugin reference links in the [Additional resources](#additional-resources) section for a complete list of all available parameters.

- **`model`** _(string)_ (optional) - Default: `gpt-4o-mini`: The model to use for the LLM. For more information, see the [OpenAI documentation](https://platform.openai.com/docs/models).

- **`temperature`** _(float)_ (optional) - Default: `0.8`: Controls the randomness of the model's output. Higher values, for example 0.8, make the output more random, while lower values, for example 0.2, make it more focused and deterministic.

Valid values are between `0` and `2`.

- **`tool_choice`** _(ToolChoice | Literal['auto', 'required', 'none'])_ (optional) - Default: `auto`: Controls how the model uses tools. Set to 'auto' to let the model decide, 'required' to force tool usage, or 'none' to disable tool usage.

## Additional resources

The following resources provide more information about using OpenAI with LiveKit Agents.

- **[OpenAI docs](https://platform.openai.com/docs)**: OpenAI platform documentation.

- **[Voice AI quickstart](https://docs.livekit.io/agents/start/voice-ai.md)**: Get started with LiveKit Agents and OpenAI.

- **[OpenAI ecosystem overview](https://docs.livekit.io/agents/integrations/openai.md)**: Overview of the entire OpenAI and LiveKit Agents integration.

---

This document was rendered at 2026-01-31T08:34:40.648Z.
For the latest version of this document, see [https://docs.livekit.io/agents/models/llm/plugins/openai.md](https://docs.livekit.io/agents/models/llm/plugins/openai.md).

To explore all LiveKit documentation, see [llms.txt](https://docs.livekit.io/llms.txt).