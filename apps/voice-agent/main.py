import asyncio
import json
import os
from uuid import UUID

from livekit import agents
from livekit.agents import AgentServer, AgentSession, inference, room_io

from assistant import KitchenAssistant

server = AgentServer()


@server.rtc_session(agent_name=os.environ['LIVEKIT_AGENT_NAME'])
async def kitchen(ctx: agents.JobContext):
    # The protected token endpoint chooses the destination, never the LLM or room roster.
    identity = str(UUID(json.loads(ctx.job.metadata)['participantIdentity']))
    limit = int(os.environ['KITCHEN_VOICE_MAX_SECONDS'])
    if not 1 <= limit <= 3600:
        raise ValueError('KITCHEN_VOICE_MAX_SECONDS must be between 1 and 3600')
    model = os.environ['KITCHEN_VOICE_REALTIME_MODEL']
    await ctx.connect()
    await asyncio.wait_for(ctx.wait_for_participant(identity=identity), timeout=20)
    session = AgentSession(llm=inference.RealtimeModel(model=model))
    await session.start(agent=KitchenAssistant(ctx.room.local_participant.perform_rpc, identity),
                        room=ctx.room, record=False,
                        room_options=room_io.RoomOptions(participant_identity=identity, video_input=False,
                                                       close_on_disconnect=True, delete_room_on_close=True))
    timer = asyncio.get_running_loop().call_later(limit, lambda: session.shutdown(drain=False))

    async def stop_timer():
        timer.cancel()

    ctx.add_shutdown_callback(stop_timer)
    await session.generate_reply(instructions='Greet the user briefly and ask what they would like to change in their kitchen. Do not change anything yet.')


if __name__ == '__main__':
    agents.cli.run_app(server)
