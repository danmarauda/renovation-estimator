import json
from collections.abc import Awaitable, Callable
from typing import Literal

from livekit import rtc
from livekit.agents import Agent, function_tool


class KitchenAssistant(Agent):
    def __init__(self, send: Callable[..., Awaitable[str]], participant: str):
        super().__init__(instructions=(
            'You operate the Incredible Kitchens studio for the person in this room. '
            'Speak briefly in Australian English. Use the live studio state, not guesses. '
            'Use studio_state for step identifiers and current selections; use finish_options '
            'for the actual option identifiers. Apply requested changes, not suggestions. '
            'If a choice is ambiguous, ask. Confirm only what the browser acknowledges. '
            'For delivery_unconfirmed, read state rather than repeating a movement. '
            'Model dimensions are illustrative and read-only. Use mm and square metres. '
            'Estimates are provisional AUD allowances, not quotes. The consultation sheet '
            'is information only: you cannot book, contact anyone, or change price rules.'
        ))
        self._send = send
        self._participant = participant

    async def _call(self, action: str, **fields) -> dict:
        try:
            response = await self._send(destination_identity=self._participant,
                                        method='kitchen.studio.v1',
                                        payload=json.dumps({'action': action, **fields}),
                                        response_timeout=4.0)
            receipt = json.loads(response)
            if isinstance(receipt, dict) and isinstance(receipt.get('ok'), bool):
                return receipt
        except (rtc.RpcError, TimeoutError, ValueError):
            pass
        return {'ok': False, 'error': 'delivery_unconfirmed'}

    @function_tool()
    async def studio_state(self) -> dict:
        """Read current choices, estimate, lighting, camera status and supported step IDs."""
        return await self._call('state')

    @function_tool()
    async def finish_options(self, part: str) -> dict:
        """List the exact groups and selectable options for one configured kitchen part."""
        return await self._call('options', part=part)

    @function_tool()
    async def set_finish(self, part: str, group: str, option: str) -> dict:
        """Apply one requested catalogue choice; all other selections are preserved."""
        return await self._call('set_option', part=part, group=group, option=option)

    @function_tool()
    async def show_step(self, step: str) -> dict:
        """Open a design step: size for measurements, summary for estimate, or a part ID."""
        return await self._call('navigate', step=step)

    @function_tool()
    async def model_measurements(self) -> dict:
        """Read dimensions from the current illustrative model, not the pricing allowance."""
        return await self._call('measurements')

    @function_tool()
    async def adjust_view(self, value: Literal['day','evening','rotate_on','rotate_off','whole','left','right','up','down','zoom_in','zoom_out']) -> dict:
        """Adjust lighting or the bounded camera; whole resets the view."""
        return await self._call('view', value=value)

    @function_tool()
    async def consultation_sheet(self, opened: bool) -> dict:
        """Show or dismiss consultation information. This does not submit a request."""
        return await self._call('consultation', open=opened)
