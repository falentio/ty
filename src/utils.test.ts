import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createTypedEvent, TypedEventEmitter } from "./ty.ts";
import { on } from "./utils.ts";

Deno.test("on", async (t) => {
	await t.step("should yield payloads from an event emitter", async () => {
		const TestEvent = createTypedEvent<string>("TestEvent");
		const emitter = new TypedEventEmitter();
		const controller = new AbortController();
		const received: string[] = [];

		const iterator = on({
			ty: emitter,
			event: TestEvent,
			signal: controller.signal,
		});

		emitter.emit(TestEvent, "hello");
		emitter.emit(TestEvent, "world");

		for await (const payload of iterator) {
			received.push(payload);
			if (received.length === 2) {
				break;
			}
		}

		assertEquals(received, ["hello", "world"]);
	});

	await t.step("should stop yielding payloads when aborted", async () => {
		const TestEvent = createTypedEvent<string>("TestEvent2");
		const emitter = new TypedEventEmitter();
		const controller = new AbortController();
		const received: string[] = [];

		const iterator = on({
			ty: emitter,
			event: TestEvent,
			signal: controller.signal,
		});

		emitter.emit(TestEvent, "hello");
		controller.abort();
		emitter.emit(TestEvent, "world");

		for await (const payload of iterator) {
			received.push(payload);
		}

		assertEquals(received, ["hello"]);
	});
});
