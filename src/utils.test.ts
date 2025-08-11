import { assertEquals } from "@std/assert";
import { createTypedEvent, TypedEventEmitter } from "./ty.ts";
import { on } from "./utils.ts";

Deno.test("on yields emitted events until aborted", async () => {
    const emitter = new TypedEventEmitter();
    const ev = createTypedEvent<number>("count");
    const controller = new AbortController();
    const received: number[] = [];

    const iterator = on({ ty: emitter, event: ev, signal: controller.signal });

    setTimeout(() => emitter.emit(ev, 1), 0);
    setTimeout(() => emitter.emit(ev, 2), 10);
    setTimeout(() => controller.abort(), 20);

    for await (const value of iterator) {
        received.push(value);
    }

    assertEquals(received, [1, 2]);
});
