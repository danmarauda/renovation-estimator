import json
import unittest
from unittest.mock import AsyncMock

from assistant import KitchenAssistant


class KitchenToolTests(unittest.IsolatedAsyncioTestCase):
    async def test_finish_targets_only_the_assigned_browser(self):
        send = AsyncMock(return_value='{"ok":true,"state":{"estimate":"updated"}}')
        agent = KitchenAssistant(send, 'visitor-id')
        reply = await agent.set_finish('cabinets', 'color', 'navy')
        self.assertTrue(reply['ok'])
        args = send.await_args.kwargs
        self.assertEqual(args['destination_identity'], 'visitor-id')
        self.assertEqual(args['method'], 'kitchen.studio.v1')
        self.assertEqual(json.loads(args['payload']), {'action':'set_option', 'part':'cabinets', 'group':'color', 'option':'navy'})

    async def test_timeout_is_not_reported_as_success_or_retried(self):
        send = AsyncMock(side_effect=TimeoutError())
        agent = KitchenAssistant(send, 'visitor-id')
        result = await agent.adjust_view('zoom_in')
        self.assertFalse(result['ok'])
        self.assertEqual(result['error'], 'delivery_unconfirmed')
        send.assert_awaited_once()

    async def test_application_rejection_is_preserved(self):
        agent = KitchenAssistant(AsyncMock(return_value='{"ok":false,"error":"unknown_option"}'), 'visitor-id')
        self.assertEqual((await agent.set_finish('cabinets','color','unknown'))['error'], 'unknown_option')
