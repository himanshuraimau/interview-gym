LiveKit docs › Agent Server › Server lifecycle

---

# Server lifecycle

> How agent servers register, receive requests, and manage jobs.

## Overview

When a user connects to a [room](https://docs.livekit.io/intro/basics/rooms-participants-tracks/rooms.md#overview), LiveKit server dispatches a request to available agent servers. The first available agent server accepts the job and starts the agent session. An overview of the server lifecycle is as follows:

1. **Agent server registration**: Your agent code registers itself as an "agent server" with LiveKit server, then waits on standby for requests.
2. **Job request**: When a user connects to a room, LiveKit server sends a request to an available agent server. An agent server accepts and starts a new process to handle the job. This is also known as [agent dispatch](https://docs.livekit.io/agents/server/agent-dispatch.md).
3. **Job**: The job initiated by your entrypoint function. This is the bulk of the code and logic you write. To learn more, see [Job lifecycle](https://docs.livekit.io/agents/server/job.md).
4. **LiveKit session close**: By default, a room is automatically closed when the last non-agent participant leaves. Any remaining agents disconnect. You can also [end the session](https://docs.livekit.io/agents/server/job.md#session-shutdown) manually.

The following diagram shows the agent server lifecycle:

![Diagram describing the functionality of agent servers](/images/agents/agents-jobs-overview.svg)

## Server features

Some additional features of agent servers include the following:

- Agent servers automatically exchange availability and capacity information with LiveKit server, enabling load balancing of incoming requests.
- Each agent server can run multiple jobs simultaneously, running each in its own process for isolation. If one crashes, it doesn't affect others running on the same agent server.
- When you deploy updates, agent servers gracefully drain active LiveKit sessions before shutting down, ensuring sessions aren't interrupted.

---

This document was rendered at 2026-01-31T08:16:35.619Z.
For the latest version of this document, see [https://docs.livekit.io/agents/server/lifecycle.md](https://docs.livekit.io/agents/server/lifecycle.md).

To explore all LiveKit documentation, see [llms.txt](https://docs.livekit.io/llms.txt).