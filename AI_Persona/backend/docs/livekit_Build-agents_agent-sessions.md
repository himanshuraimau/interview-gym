LiveKit docs › Logic & Structure › Agent sessions

---

# Agent session

> How to use AgentSession to orchestrate your voice AI app.

## Overview

The `AgentSession` is the main orchestrator for your voice AI app. The session is responsible for collecting user input, managing the voice pipeline, invoking the LLM, sending the output back to the user, and emits events for observability and control.

Each session requires at least one `Agent` to orchestrate. The agent is responsible for defining the core AI logic - instructions, tools, etc - of your app. The framework supports the design of custom [workflows](https://docs.livekit.io/agents/logic/workflows.md) to orchestrate handoff and delegation between multiple agents.

The following example shows how to begin a simple single-agent session:

**Python**:

```python
from livekit.agents import AgentSession, Agent, inference, room_io
from livekit.plugins import noise_cancellation, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

session = AgentSession(
    stt="assemblyai/universal-streaming:en",
    llm="openai/gpt-4.1-mini",
    tts="cartesia/sonic-3:9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
    vad=silero.VAD.load(),
    turn_detection=MultilingualModel(),
)

await session.start(
    room=ctx.room,
    agent=Agent(instructions="You are a helpful voice AI assistant."),
    room_options=room_io.RoomOptions(
        audio_input=room_io.AudioInputOptions(
            noise_cancellation=noise_cancellation.BVC(),
        ),
    ),
)

```

---

**Node.js**:

```ts
import { voice, inference } from '@livekit/agents';
import * as livekit from '@livekit/agents-plugin-livekit';
import * as silero from '@livekit/agents-plugin-silero';
import { BackgroundVoiceCancellation } from '@livekit/noise-cancellation-node';

const vad = await silero.VAD.load();

const session = new voice.AgentSession({
  vad,
  stt: "assemblyai/universal-streaming:en",
  llm: "openai/gpt-4.1-mini",
  tts: "cartesia/sonic-3:9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
  turnDetection: new livekit.turnDetector.MultilingualModel(),
});

await session.start({
  room: ctx.room,
  agent: new voice.Agent({
    instructions: "You are a helpful voice AI assistant.",
  }),
  inputOptions: {
    noiseCancellation: BackgroundVoiceCancellation(),
  },
});

```

## Lifecycle

An `AgentSession` progresses through several distinct phases during its operation:

- **Initializing**: The session is setting up. During initialization, no audio or video processing occurs yet. Agent state is set to `initializing`.
- **Starting**: The session is started using the `start()` method. It sets up I/O connections, initializes agent activity tracking, and begins forwarding audio and video frames. In this phase, the agent is transitioned into the `listening` state.
- **Running**: The session is actively processing user input and generating agent responses. During this phase, your agent controls the session and can transfer control to other agents. In this phase, the agent transitions between `listening`, `thinking`, and `speaking` states.
- **Closing**: When a session is closed, the cleanup process includes gracefully draining pending speech (if requested), waiting for any queued operations to complete, committing any remaining user transcripts, and closing all I/O connections. The session emits a `close` event and resets internal state.

The following diagram shows the lifecycle of an `AgentSession` using agent states:

```mermaid
stateDiagram-v2
initializing --> listening : session started
listening --> thinking : user input received
thinking --> speaking : response generated
speaking --> listening : response complete
speaking --> listening : interrupted
listening --> initializing : session shutdown requested and states resetnote right of initializing
Session setup in progress
(no media I/O yet)
end notenote right of speaking
Agent outputs synthesized
audio response
end note
```

You can monitor agent state changes via the [`agent_state_changed` event](https://docs.livekit.io/reference/other/events.md#agent_state_changed).

## Events

`AgentSession` emits events throughout its lifecycle to provide visibility into the conversation flow. For more information, select the event name to see the properties and example code.

| **Event** | **Description** |
| [`agent_state_changed`](https://docs.livekit.io/reference/other/events.md#agent_state_changed) | Emitted when the agent's state changes (for example, from `listening` to `thinking` or `speaking`). |
| [`user_state_changed`](https://docs.livekit.io/reference/other/events.md#user_state_changed) | Emitted when the user's state changes (for example, from `listening` to `speaking`). |
| [`user_input_transcribed`](https://docs.livekit.io/reference/other/events.md#user_input_transcribed) | Emitted when user speech is transcribed to text. |
| [`conversation_item_added`](https://docs.livekit.io/reference/other/events.md#conversation_item_added) | Emitted when a message is added to the conversation history. |
| [`close`](https://docs.livekit.io/reference/other/events.md#close) | Emitted when the session closes, either gracefully or due to an error. |

## Session options

The `AgentSession` constructor accepts numerous options to configure behavior. The following sections describe the available options grouped by category.

### AI models

Configure the default speech and language models for your agent session. You can override these models for specific agents or tasks. To learn more about models, see the [models](https://docs.livekit.io/agents/models.md) topic.

### Turn detection & interruptions

Turn detection and interruptions are critical for managing conversation flow. The session provides several options to configure this behavior. For more information, see [Session configuration](https://docs.livekit.io/agents/build/turns.md#session-configuration).

### Tools and capabilities

Extend agent capabilities with [tools](https://docs.livekit.io/agents/build/tools.md):

- `tools`: List of `FunctionTool` or `RawFunctionTool` objects shared by all agents in the session.
- `mcp_servers`: List of MCP (Model Context Protocol) servers providing external tools.
- `max_tool_steps`: Maximum consecutive tool calls per LLM turn. Default: `3`.
- `ivr_detection`: Whether to detect if the agent is interacting with an Interactive Voice Response (IVR) system. Default: `False`. To learn more, see [DTMF](https://docs.livekit.io/telephony/features/dtmf.md).

### User interaction

Configure user state and timing:

- `user_away_timeout`: Time in seconds of silence before setting user state to `away`. Set to `None` to turn off. Default: `15.0` seconds.
- `min_consecutive_speech_delay`: Minimum delay in seconds between consecutive agent utterances. Default: `0.0` seconds.

### Text processing

Control how [text](https://docs.livekit.io/agents/build/text.md) is processed:

- `tts_text_transforms`: Transforms to apply to TTS input text. Built-in transforms include `"filter_markdown"` and `"filter_emoji"`. Set to `None` to turn off. When not given, all filters are applied by default.
- `use_tts_aligned_transcript`: Whether to use TTS-aligned transcript as input for the transcription node. Only applies if the TTS supports aligned transcripts. Default: turned off.

### Performance optimization

Optimize response latency:

[`preemptive_generation`](https://docs.livekit.io/agents/build/audio.md#preemptive-generation): Whether to speculatively begin LLM and TTS requests before an end-of-turn is detected. When `True`, the agent sends inference calls as soon as a user transcript is received. This can reduce response latency but can incur extra compute costs if the user interrupts. Default: `False`.

### Video sampling

Control video frame processing:

`video_sampler`: Custom video sampler function or `None`. When not given, uses `VoiceActivityVideoSampler` which captures at ~1 fps while speaking and ~0.3 fps when silent. To learn more, see [Video](https://docs.livekit.io/agents/build/vision.md).

### Other options

`userdata`: Arbitrary per-session user data accessible via `session.userdata`. To learn more, see [Passing state](https://docs.livekit.io/agents/logic/agents-handoffs.md#passing-state).

## rtc_session options

The following optional parameters are available when you define your entrypoint function using the `rtc_session` decorator:

- `agent_name`: Name of agent for agent disaptch. If this is set, the agent must be explicitly dispatched to a room. To learn more, see [Agent dispatch](https://docs.livekit.io/agents/server/agent-dispatch.md).
- `type`: Agent server type determines when a new instance of the agent is created: for each room or for each publisher in a room. To learn more, see [Agent server type](https://docs.livekit.io/agents/server/options.md#servertype).
- `on_session_end`: Callback function to be called when the session ends. To learn more, see [Session reports](https://docs.livekit.io/deploy/observability/data.md#session-reports).
- `on_request`: Callback function to be called when a new request is received. To learn more see [Request handler](https://docs.livekit.io/agents/server/options.md#request-handler).

## RoomIO

Communication between agent and user participants happens using media streams, also known as tracks. For voice AI apps, this is primarily audio, but can include vision. By default, track management is handled by `RoomIO`, a utility class that serves as a bridge between the agent session and the LiveKit room. When an AgentSession is initiated, it automatically creates a `RoomIO` object that enables all room participants to subscribe to available audio tracks.

When starting an `AgentSession`, you can configure how the session interacts with the LiveKit room by passing `room_options` to the `start()` method. These options control media track management, participant linking, and I/O behavior.

### Linked participant

In a session, an agent interacts with a specific _linked participant_. By default, the linked participant is the first participant to join a room. You can manually set or change the linked participant using the following methods:

- Pass the participant identity to the `RoomIO` constructor when creating the session. This requires a custom `RoomIO` object to be created. To learn more, see [Custom RoomIO](#custom-roomio).
- Set `participant_identity` in `RoomOptions` (or `RoomInputOptions` in Node.js). To learn more, see [Participant management](#participant-management).
- Call `RoomIO.set_participant()` within a session to change the linked participant dynamically.

#### Identifying the linked participant

Available in:
- [ ] Node.js
- [x] Python

In the default case, the linked participant is the first participant to join a room. You can identify the linked participant using the `session.room_io.linked_participant` property after starting the session:

**Python**:

```python

await session.start(
    # ... agent, room, room_options, etc.
)

participant = session.room_io.linked_participant

```

### Room options

Configure how the agent interacts with room participants using `RoomOptions`. The following sections describe available options for input and output configuration.

> ℹ️ **Python and Node.js differences**
> 
> In Python, as of the 1.3.1 release, a unified `RoomOptions` class is used to configure both input and output options for the session. In Node.js, `RoomInputOptions` and `RoomOutputOptions` are still supported.

#### In this section

The following sections describe the available room options:

| Component | Description | Use cases |
| [Input options](#input-options) | Configure input options for text, audio, and video. | Enable noise cancellation, pre-connect audio, or configure additional audio input options. Enable video input, add a callback function for text input, or disable text input entirely. |
| [Output options](#output-options) | Configure output options for text and audio. | Set transcription options, disable audio output, or set audio output sample rate, number of channels, and track options. |
| [Participant management](#participant-management) | Configure participant management options. | Configure the types of participants an agent can interact with and set the linked participant for the session. |
| [Clean up options](#clean-up-options) | Configure options for cleaning up session and room. | Close the session when linked participant leaves or automatically delete the room on session end. |

#### Input options

The following sections describe the available input options for [text](#text-input), [audio](#audio-input), and [video](#video-input).

##### Text input options

To enable or turn off text input, set the following parameter to `True` or `False`.

**Python**:

`RoomOptions.text_input`

---

**Node.js**:

`RoomInputOptions.textEnabled`

###### Text input callback

By default, text input interrupts the agent and generates a reply. You can customize this behavior by adding a callback function to handle text input. To learn more, see [Custom handling](https://docs.livekit.io/agents/build/text.md#custom-handling) of text input.

##### Audio input options

To enable or turn off audio input, set the following parameter to `True` or `False`.

**Python**:

`RoomOptions.audio_input`

---

**Node.js**:

`RoomInputOptions.audioEnabled`

Additional options for audio input are available using the `AudioInputOptions` object (Python) or `RoomInputOptions.audioOptions` (Node.js):

- [Noise cancellation](https://docs.livekit.io/transport/media/enhanced-noise-cancellation.md#livekit-agents) options: Reduce background noise in incoming audio.
- [Pre-connect audio](https://docs.livekit.io/agents/multimodality/audio.md#instant-connect) options (Python Agent SDK only): Buffer audio prior to connection to reduce perceived latency.

For a full list of audio input options, see the reference documentation:

**Python**:

[AudioInputOptions](https://docs.livekit.io/reference/python/v1/livekit/agents/voice/room_io/index.html.md#livekit.agents.voice.room_io.AudioInputOptions)

---

**Node.js**:

[RoomInputOptions.audioOptions](https://docs.livekit.io/reference/agents-js/interfaces/agents.voice.RoomInputOptions.html.md#audiooptions)

##### Video input options

Enable or turn off video input, set the following parameter to `True` or `False`. By default, video input is disabled.

**Python**:

`RoomOptions.video_input`

---

**Node.js**:

`RoomInputOptions.videoEnabled`

#### Output options

The following sections describe the available output options for text and audio.

##### Text output options

To enable or turn off text output, set the following parameter to `True` or `False`. By default, text output is enabled.

**Python**:

`RoomOptions.text_output`

---

**Node.js**:

`RoomOutputOptions.transcriptionEnabled`

###### Transcription options

By default, audio and text output are both enabled and a transcription is emitted in sync with the audio. You can turn off transcriptions or customize this behavior. To learn more, see [Transcriptions](https://docs.livekit.io/agents/multimodality/text.md#transcriptions).

##### Audio output options

To enable or turn off audio output, set the following parameter to `True` or `False`. By default, audio output is enabled.

**Python**:

`RoomOptions.audio_output`

---

**Node.js**:

`RoomOutputOptions.audioEnabled`

For additional audio output options, see the reference documentation:

**Python**:

[AudioOutputOptions](https://docs.livekit.io/reference/python/v1/livekit/agents/voice/room_io/index.html.md#livekit.agents.voice.room_io.AudioOutputOptions)

---

**Node.js**:

[RoomOutputOptions.audioOptions](https://docs.livekit.io/reference/agents-js/interfaces/agents.voice.RoomOutputOptions.html.md#audiooptions)

#### Participant management

Use the following parameters to configure which types of participants your agent can interact with.

- **`participant_kinds`** _(list<rtc.ParticipantKind.ValueType>)_ (optional) - Default: `[rtc.ParticipantKind.PARTICIPANT_KIND_SIP, rtc.ParticipantKind.PARTICIPANT_KIND_STANDARD]`: List of [participant types](https://docs.livekit.io/intro/basics/rooms-participants-tracks/participants.md#types-of-participants) accepted for auto subscription. The list determines which types of participants can be linked to the session. By default, includes `SIP` and `STANDARD` participants.

- **`participant_identity`** _(string)_ (optional) - Default: `None`: The participant identity to link to. The linked participant is the one the agent listens and responds to. By default, links to the first participant that joins the room. You can override this in the `RoomIO` constructor or by using `RoomIO.set_participant()`.

#### Clean up options

Use the following parameters to configure cleanup options for session and room.

##### Close when participant leaves

An `AgentSession` is associated with a specific participant in a LiveKit room. This participant is the _linked participant_ for the session. By default, the session automatically closes when the linked participant leaves the room for any of the following reasons:

- `CLIENT_INITIATED`: User initiated the disconnect.
- `ROOM_DELETED`: Delete room API was called.
- `USER_REJECTED`: Call was rejected by the user (for example, the line was busy).

You can leave the session open by turning this behavior off using the following parameter:

**Python**:

`RoomOptions.close_on_disconnect`

---

**Node.js**:

`RoomInputOptions.closeOnDisconnect`

##### Delete room when session ends

Available in:
- [ ] Node.js
- [x] Python

You can automatically delete the room on session end by setting the `delete_room_on_close` parameter to `True`. By default, after the last participant leaves a room, it remains open for a grace period specified by `departure_timeout` set on the [room](https://docs.livekit.io/reference/other/roomservice-api.md#room). Enabling `delete_room_on_close` ensures the room is deleted immediately after the session ends.

- **`delete_room_on_close`** _(bool)_ (optional) - Default: `False`: Whether to delete the room on session end. Default: `False`.

### Example usage

**Python**:

```python
from livekit.agents import room_io
from livekit.plugins import noise_cancellation


room_options=room_io.RoomOptions(
    video_input=True,
    audio_input=room_io.AudioInputOptions(
        noise_cancellation=noise_cancellation.BVC(),
    ),
    text_output=room_io.TextOutputOptions(
        sync_transcription=False,
    ),
    participant_identity="user_123",
)

await session.start(
    agent=my_agent,
    room=room,
    room_options=room_options,
)

```

---

**Node.js**:

In the Node.js Agents framework, room configuration uses separate `inputOptions` and `outputOptions` parameters instead of a unified `RoomOptions` object. For the complete interface definitions and default values, refer to the [RoomIO source code](https://github.com/livekit/agents-js/blob/main/agents/src/voice/room_io/room_io.ts).

When calling `session.start()`, pass `inputOptions` and `outputOptions` as separate parameters:

```typescript
import { BackgroundVoiceCancellation } from '@livekit/noise-cancellation-node';

// ... session and agentsetup

await session.start({
  room: ctx.room,
  agent: myAgent,
  inputOptions: {
    textEnabled: true,
    audioEnabled: true,
    videoEnabled: true,
    noiseCancellation: BackgroundVoiceCancellation(),
    participantIdentity: "user_123",
  },
  outputOptions: {
    syncTranscription: false,
  },
});

```

To learn more about publishing audio and video, see the following topics:

- **[Agent speech and audio](https://docs.livekit.io/agents/build/audio.md)**: Add speech, audio, and background audio to your agent.

- **[Vision](https://docs.livekit.io/agents/build/vision.md)**: Give your agent the ability to see images and live video.

- **[Text and transcription](https://docs.livekit.io/agents/build/text.md)**: Send and receive text messages and transcription to and from your agent.

- **[Realtime media](https://docs.livekit.io/transport/media.md)**: Tracks are a core LiveKit concept. Learn more about publishing and subscribing to media.

- **[Camera and microphone](https://docs.livekit.io/transport/media/publish.md)**: Use the LiveKit SDKs to publish audio and video tracks from your user's device.

### Custom RoomIO

For greater control over media sharing in a room,  you can create a custom `RoomIO` object. For example, you might want to manually control which input and output devices are used, or to control which participants an agent listens to or responds to.

To replace the default one created in `AgentSession`, create a `RoomIO` object in your entrypoint function and pass it an instance of the `AgentSession` in the constructor. For examples, see the following in the repository:

- **[Toggling audio](https://github.com/livekit/agents/blob/main/examples/voice_agents/push_to_talk.py)**: Create a push-to-talk interface to toggle audio input and output.

- **[Toggling input and output](https://github.com/livekit/agents/blob/main/examples/voice_agents/toggle_io.py)**: Toggle both audio and text input and output.

---

This document was rendered at 2026-01-31T08:13:45.534Z.
For the latest version of this document, see [https://docs.livekit.io/agents/logic/sessions.md](https://docs.livekit.io/agents/logic/sessions.md).

To explore all LiveKit documentation, see [llms.txt](https://docs.livekit.io/llms.txt).