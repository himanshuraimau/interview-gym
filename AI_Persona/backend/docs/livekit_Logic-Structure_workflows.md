# LiveKit Workflows Documentation

> Documentation for workflows in LiveKit Agents

## Overview

LiveKit docs › Logic & Structure › Workflows

---

# Workflows

> How to model repeatable, accurate workflows through agents, handoffs, and tasks.

## Overview

The LiveKit Agents framework lets you build sophisticated voice AI apps with multiple personas, conversation phases, or specialized capabilities using agents, handoffs, and tasks.

## Core constructs

An [**agent session**](https://docs.livekit.io/agents/logic/sessions.md) is the main orchestrator of your voice AI app and can be composed of one or more agents. Agents are one of the core building blocks of a workflow that also includes tasks and tools. Each plays a distinct role in creating a flexible, maintainable system:

- [**Agents**](https://docs.livekit.io/agents/logic/agents-handoffs.md) hold long-lived control of a session. They define instructions, reasoning behavior, and tools, and can transfer control to another agent when different rules or capabilities are required.
- [**Tools**](https://docs.livekit.io/agents/build/tools.md) are user-defined functions callable by the model. They allow the agent to perform actions beyond generative text, such as reading from or writing to external systems. Tool invocations are model-driven: the LLM chooses to call them based on context, and the returned results are fed back to the model for continued reasoning. Tools can also trigger agent **handoffs**.
- [**Tasks**](https://docs.livekit.io/agents/logic/tasks.md) are short-lived units of work that run to completion and return a typed result. Unlike agents, tasks do not persist; they take temporary control only while executing. Tasks can include tool definitions used to complete their objectives.
- [**Task groups**](https://docs.livekit.io/agents/logic/tasks.md#taskgroup) run sequences of tasks for multi-step operations. They allow users to revisit earlier steps when corrections are needed, and all tasks in a group share conversation context. The summarized result is returned to the controlling agent when the group finishes.

This architecture makes workflows explicit and predictable: agents manage ongoing conversational control, tasks encapsulate discrete operations, tools execute side effects and enable handoffs, and task groups coordinate ordered multi-step flows with regression support. Together, these constructs form a testable and maintainable execution model for non-trivial voice AI systems.

## Best practices

Before building your workflow, map out the conversation phases, identify where different personas or capabilities are needed, and determine which operations are short-lived versus continuous. The following guidelines help you choose the right pattern for each part of your workflow:

- Create separate [**agents**](https://docs.livekit.io/agents/logic/agents-handoffs.md) when you need distinct reasoning behavior or tool access.
- Use [**tasks**](https://docs.livekit.io/agents/logic/tasks.md) for discrete operations that must complete before continuing the conversation (for example, consent collection, data capture, or verification).
- Expose external actions through [**tools**](https://docs.livekit.io/agents/build/tools.md) with clear purpose and meaningful return values that contribute to reasoning.
- Plan how [**conversation context**](https://docs.livekit.io/agents/logic/agents-handoffs.md#context-preservation) is preserved or reset across agents. Some transitions require full continuity; others benefit from a clean slate.
- Use a [**task group**](https://docs.livekit.io/agents/logic/tasks.md#taskgroup) for ordered multi-step processes that might need to revisit earlier steps.
- Build workflows incrementally. Add [**tests and evals**](https://docs.livekit.io/agents/start/testing.md) to verify tool, task, and agent behavior.
- Design for **user experience**: announce handoffs, preserve relevant context to avoid repetition, and handle correction paths cleanly.

Following these patterns keeps complex workflows predictable, testable, and extensible.

## Additional resources

For more information on specific topics related to building voice AI workflows, see the following topics:

- **[Agents and handoffs](https://docs.livekit.io/agents/build/agents-handoffs.md)**: Define agents and agent handoffs to build multi-agent voice AI workflows.

- **[Tasks & task groups](https://docs.livekit.io/agents/build/tasks.md)**: Use tasks and task groups to execute discrete operations and build complex workflows.

- **[Prompting guide](https://docs.livekit.io/agents/start/prompting.md)**: Complete guide to writing good instructions for your agents.

- **[Tool definition and use](https://docs.livekit.io/agents/build/tools.md)**: Use tools to call external services, inject custom logic, agent handoffs,and more.

- **[Testing & evaluation](https://docs.livekit.io/agents/start/testing.md)**: Test every aspect of your agents with a custom test suite.

---

This document was rendered at 2026-01-31T08:36:57.927Z.
For the latest version of this document, see [https://docs.livekit.io/agents/logic/workflows.md](https://docs.livekit.io/agents/logic/workflows.md).

To explore all LiveKit documentation, see [llms.txt](https://docs.livekit.io/llms.txt).