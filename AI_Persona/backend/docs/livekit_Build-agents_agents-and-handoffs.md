LiveKit docs › Logic & Structure › Agents & handoffs

---

# Agents and handoffs

> How to use agents and handoffs as part of a voice AI workflow.

## Overview

Agents are the core units of a voice AI [workflow](https://docs.livekit.io/agents/logic/workflows.md). They define the instructions, tools, and reasoning behavior that drive a conversation. An agent can transfer control to other agents when different logic or capabilities are required. Create separate agents when you need distinct reasoning behavior or tool access:

- **Different roles**: A moderator agent versus a coaching agent.
- **Model specialization**: A lightweight triage model before escalating to a larger one.
- **Different permissions**: An agent with payment API access versus one handling general inquiries.
- **Specialized contexts**: Agents optimized for particular conversation phases.

## Agents

Agents orchestrate the session flow—managing tools, reasoning steps, and control transfers between other agents or tasks.

### Defining an agent

Extend the `Agent` class to define a custom agent.

**Python**:

```python
from livekit.agents import Agent

class HelpfulAssistant(Agent):
    def __init__(self):
        super().__init__(instructions="You are a helpful voice AI assistant.")

    async def on_enter(self) -> None:
        await self.session.generate_reply(instructions="Greet the user and ask how you can help them.")

```

---

**Node.js**:

```ts
import { voice } from '@livekit/agents';

class HelpfulAssistant extends voice.Agent {
  constructor() {
    super({
      instructions: 'You are a helpful voice AI assistant.',
    });
  }

  async onEnter(): Promise<void> {
    this.session.generateReply({
      instructions: 'Greet the user and ask how you can help them.',
    });
  }
}

```

You can also create an instance of `Agent` class directly:

**Python**:

```python
agent = Agent(instructions="You are a helpful voice AI assistant.")

```

---

**Node.js**:

```ts
const agent = new voice.Agent({
  instructions: 'You are a helpful voice AI assistant.',
});

```

### Setting the active agent

The **active** agent is the agent currently in control of the session. The initial agent is defined in the `AgentSession` constructor. You can change the active agent using the `update_agent` method in Python, or a handoff from a [tool call](#tool-handoff).

Specify the initial agent in the `AgentSession` constructor:

**Python**:

```python
session = AgentSession(
    agent=CustomerServiceAgent()
    # ...
)

```

---

**Node.js**:

```ts
await session.start({
  agent: new CustomerServiceAgent(),
  room: ctx.room,
});

```

To set a new agent, use the `update_agent` method:

Available in:
- [ ] Node.js
- [x] Python

```python
session.update_agent(CustomerServiceAgent())

```

### Agent handoffs

A **handoff** transfers session control from one agent to another. You can return a different agent from within a tool call to hand off control automatically. This allows the LLM to make decisions about when a handoff should occur. For more information, see [tool return value](https://docs.livekit.io/agents/build/tools.md#return-value).

**Python**:

```python
from livekit.agents import Agent, function_tool

class CustomerServiceAgent(Agent):
    def __init__(self):
        super().__init__(
            instructions="""You are a friendly customer service representative. Help customers with 
            general inquiries, account questions, and technical support. If a customer needs 
            specialized help, transfer them to the appropriate specialist."""
        )

    async def on_enter(self) -> None:
        await self.session.generate_reply(instructions="Greet the user warmly and offer your assistance.")

    @function_tool()
    async def transfer_to_billing(self, context: RunContext):
        """Transfer the customer to a billing specialist for account and payment questions."""
        return BillingAgent(chat_ctx=self.chat_ctx), "Transferring to billing"

    @function_tool()
    async def transfer_to_technical_support(self, context: RunContext):
        """Transfer the customer to technical support for product issues and troubleshooting."""
        return TechnicalSupportAgent(chat_ctx=self.chat_ctx), "Transferring to technical support"

class BillingAgent(Agent):
    def __init__(self):
        super().__init__(
            instructions="""You are a billing specialist. Help customers with account questions, 
            payments, refunds, and billing inquiries. Be thorough and empathetic."""
        )

    async def on_enter(self) -> None:
        await self.session.generate_reply(instructions="Introduce yourself as a billing specialist and ask how you can help with their account.")

class TechnicalSupportAgent(Agent):
    def __init__(self):
        super().__init__(
            instructions="""You are a technical support specialist. Help customers troubleshoot 
            product issues, setup problems, and technical questions. Ask clarifying questions 
            to diagnose problems effectively."""
        )

    async def on_enter(self) -> None:
        await self.session.generate_reply(instructions="Introduce yourself as a technical support specialist and offer to help with any technical issues.")

```

---

**Node.js**:

```ts
import { voice, llm } from '@livekit/agents';

class CustomerServiceAgent extends voice.Agent {
  constructor() {
    super({
      instructions: `You are a friendly customer service representative. Help customers with 
        general inquiries, account questions, and technical support. If a customer needs 
        specialized help, transfer them to the appropriate specialist.`,
      tools: {
        transferToBilling: llm.tool({
          description: 'Transfer the customer to a billing specialist for account and payment questions.',
          execute: async (_, { ctx }) => {
            return llm.handoff({
              agent: new BillingAgent(),
              returns: 'Transferring to billing',
            });
          },
        }),
        transferToTechnicalSupport: llm.tool({
          description: 'Transfer the customer to technical support for product issues and troubleshooting.',
          execute: async (_, { ctx }) => {
            return llm.handoff({
              agent: new TechnicalSupportAgent(),
              returns: 'Transferring to technical support',
            });
          },
        }),
      },
    });
  }

  async onEnter(): Promise<void> {
    this.session.generateReply({
      instructions: 'Greet the user warmly and offer your assistance.',
    });
  }
}

class BillingAgent extends voice.Agent {
  constructor() {
    super({
      instructions: `You are a billing specialist. Help customers with account questions, 
        payments, refunds, and billing inquiries. Be thorough and empathetic.`,
    });
  }

  async onEnter(): Promise<void> {
    this.session.generateReply({
      instructions: 'Introduce yourself as a billing specialist and ask how you can help with their account.',
    });
  }
}

class TechnicalSupportAgent extends voice.Agent {
  constructor() {
    super({
      instructions: `You are a technical support specialist. Help customers troubleshoot 
        product issues, setup problems, and technical questions. Ask clarifying questions 
        to diagnose problems effectively.`,
    });
  }

  async onEnter(): Promise<void> {
    this.session.generateReply({
      instructions: 'Introduce yourself as a technical support specialist and offer to help with any technical issues.',
    });
  }
}

```

#### Chat history

When an agent handoff occurs, an `AgentHandoff` item (or `AgentHandoffItem` in Node.js) is added to the chat context with the following properties:

- `old_agent_id`: ID of the agent that was active before the handoff.
- `new_agent_id`: ID of the agent that took over session control after the handoff.

### Passing state

To store custom state within your session, use the `userdata` attribute. The type of `userdata` is up to you, but the recommended approach is to use a `dataclass` in Python or a typed interface in TypeScript.

**Python**:

```python
from livekit.agents import AgentSession
from dataclasses import dataclass

@dataclass
class MySessionInfo:
    user_name: str | None = None
    age: int | None = None

```

---

**Node.js**:

```ts
interface MySessionInfo {
  userName?: string;
  age?: number;
}

```

To add userdata to your session, pass it in the constructor. You must also specify the type of userdata on the `AgentSession` itself.

**Python**:

```python
session = AgentSession[MySessionInfo](
    userdata=MySessionInfo(),
    # ... tts, stt, llm, etc.
)

```

---

**Node.js**:

```ts
const session = new voice.AgentSession<MySessionInfo>({
  userData: { userName: 'Steve' },
  // ... vad, stt, tts, llm, etc.
});

```

Userdata is available as `session.userdata`, and is also available within function tools on the `RunContext`. The following example shows how to use userdata in an agent workflow that starts with the `IntakeAgent`.

**Python**:

```python
class IntakeAgent(Agent):
    def __init__(self):
        super().__init__(
            instructions="""You are an intake agent. Learn the user's name and age."""
        )
        
    @function_tool()
    async def record_name(self, context: RunContext[MySessionInfo], name: str):
        """Use this tool to record the user's name."""
        context.userdata.user_name = name
        return self._handoff_if_done()
    
    @function_tool()
    async def record_age(self, context: RunContext[MySessionInfo], age: int):
        """Use this tool to record the user's age."""
        context.userdata.age = age
        return self._handoff_if_done()
    
    def _handoff_if_done(self):
        if self.session.userdata.user_name and self.session.userdata.age:
            return CustomerServiceAgent()
        else:
            return None

class CustomerServiceAgent(Agent):
    def __init__(self):
        super().__init__(instructions="You are a friendly customer service representative.")

    async def on_enter(self) -> None:
        userdata: MySessionInfo = self.session.userdata
        await self.session.generate_reply(
            instructions=f"Greet {userdata.user_name} personally and offer your assistance."
        )

```

---

**Node.js**:

```ts
import { voice, llm } from '@livekit/agents';
import { z } from 'zod';

class IntakeAgent extends voice.Agent<MySessionInfo> {
  constructor() {
    super({
      instructions: "You are an intake agent. Learn the user's name and age.",
      tools: {
        recordName: llm.tool({
          description: 'Use this tool to record the user\'s name.',
          parameters: z.object({
            name: z.string(),
          }),
          execute: async ({ name }, { ctx }) => {
            ctx.userData.userName = name;
            return this.handoffIfDone(ctx);
          },
        }),
        recordAge: llm.tool({
          description: 'Use this tool to record the user\'s age.',
          parameters: z.object({
            age: z.number(),
          }),
          execute: async ({ age }, { ctx }) => {
            ctx.userData.age = age;
            return this.handoffIfDone(ctx);
          },
        }),
      },
    });
  }

  private handoffIfDone(ctx: voice.RunContext<MySessionInfo>) {
    if (ctx.userData.userName && ctx.userData.age) {
      return llm.handoff({
        agent: new CustomerServiceAgent(),
        returns: 'Information collected, transferring to customer service',
      });
    }
    return 'Please provide both your name and age.';
  }
}

class CustomerServiceAgent extends voice.Agent<MySessionInfo> {
  constructor() {
    super({
      instructions: 'You are a friendly customer service representative.',
    });
  }

  async onEnter(): Promise<void> {
    const userData = this.session.userData;
    this.session.generateReply({
      instructions: `Greet ${userData.userName} personally and offer your assistance.`,
    });
  }
}

```

## Context preservation

By default, each new agent or task starts with a fresh conversation history for their LLM prompt. To include the prior conversation, set the `chat_ctx` parameter in the `Agent` or `AgentTask` constructor. You can either copy the prior agent's `chat_ctx`, or construct a new one based on custom business logic to provide the appropriate context.

**Python**:

```python
from livekit.agents import ChatContext, function_tool, Agent

class TechnicalSupportAgent(Agent):
    def __init__(self, chat_ctx: ChatContext):
        super().__init__(
            instructions="""You are a technical support specialist. Help customers troubleshoot 
            product issues, setup problems, and technical questions.""",
            chat_ctx=chat_ctx
        )

class CustomerServiceAgent(Agent):
    # ...

    @function_tool()
    async def transfer_to_technical_support(self):
        """Transfer the customer to technical support for product issues and troubleshooting."""
        await self.session.generate_reply(instructions="Inform the customer that you're transferring them to the technical support team.")
        
        # Pass the chat context during handoff
        return TechnicalSupportAgent(chat_ctx=self.session.chat_ctx)

```

---

**Node.js**:

```ts
import { voice, llm } from '@livekit/agents';

class TechnicalSupportAgent extends voice.Agent {
  constructor(chatCtx: llm.ChatContext) {
    super({
      instructions: `You are a technical support specialist. Help customers troubleshoot 
        product issues, setup problems, and technical questions.`,
      chatCtx,
    });
  }
}

class CustomerServiceAgent extends voice.Agent {
  constructor(chatCtx: llm.ChatContext) {
    super({
      // ... instructions, chatCtx, etc.
      tools: {
        transferToTechnicalSupport: llm.tool({
          description: 'Transfer the customer to technical support for product issues and troubleshooting.',
          execute: async (_, { ctx }) => {
            await ctx.session.generateReply({
              instructions: 'Inform the customer that you\'re transferring them to the technical support team.',
            });
            
            return llm.handoff({
              agent: new TechnicalSupportAgent(ctx.session.chatCtx),
              returns: 'Transferring to technical support team',
            });
          },
        }),
      },
    });
  }
}

```

The complete conversation history for the session is always available in `session.history`.

## Overriding plugins

You can override any of the plugins used in the session by setting the corresponding attributes in your `Agent` or `AgentTask` constructor. This allows you to customize the behavior and properties of the active agent or task in the session by modifying the prompt, TTS, LLM, STT plugins, and more.

For instance, you can change the voice for a specific agent by overriding the `tts` attribute:

**Python**:

```python
from livekit.agents import Agent

class CustomerServiceManager(Agent):
    def __init__(self):
        super().__init__(
            instructions="You are a customer service manager who can handle escalated issues.",
            tts="cartesia/sonic-3:6f84f4b8-58a2-430c-8c79-688dad597532"
        )

```

---

**Node.js**:

```ts
import { voice } from '@livekit/agents';

class CustomerServiceManager extends voice.Agent {
  constructor() {
    super({
      instructions: 'You are a customer service manager who can handle escalated issues.',
      tts: "cartesia/sonic-3:6f84f4b8-58a2-430c-8c79-688dad597532",
    });
  }
}

```

## Examples

These examples show how to build more complex workflows with multiple agents:

- **[Drive-thru agent](https://github.com/livekit/agents/blob/main/examples/drive-thru)**: A complex food ordering agent with tasks, tools, and a complete evaluation suite.

- **[Front-desk agent](https://github.com/livekit/agents/blob/main/examples/frontdesk)**: A calendar booking agent with tasks, tools, and evaluations.

- **[Medical Office Triage](https://github.com/livekit-examples/python-agents-examples/tree/main/complex-agents/medical_office_triage)**: Agent that triages patients based on symptoms and medical history.

- **[Restaurant Agent](https://github.com/livekit/agents/blob/main/examples/voice_agents/restaurant_agent.py)**: A restaurant front-of-house agent that can take orders, add items to a shared cart, and checkout.

## Additional resources

For more information on concepts covered in this topic, see the following related topics:

- **[Workflows](https://docs.livekit.io/agents/build/workflows.md)**: Complete guide to defining and using workflows in your agents.

- **[Tool definition and use](https://docs.livekit.io/agents/build/tools.md)**: Complete guide to defining and using tools in your agents.

- **[Tasks & task groups](https://docs.livekit.io/agents/build/tasks.md)**: Complete guide to defining and using tasks and task groups in your agents workflows.

- **[Nodes](https://docs.livekit.io/agents/build/nodes.md)**: Add custom behavior to any component of the voice pipeline.

- **[Agent speech](https://docs.livekit.io/agents/build/audio.md)**: Customize the speech output of your agents.

- **[Testing & evaluation](https://docs.livekit.io/agents/start/testing.md)**: Test every aspect of your agents with a custom test suite.

---

This document was rendered at 2026-01-31T08:48:53.642Z.
For the latest version of this document, see [https://docs.livekit.io/agents/logic/agents-handoffs.md](https://docs.livekit.io/agents/logic/agents-handoffs.md).

To explore all LiveKit documentation, see [llms.txt](https://docs.livekit.io/llms.txt).