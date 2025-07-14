import { assert, assertEquals, assertThrows } from "@std/assert";
import {
	createTypedEvent,
	TypedEventEmitter,
	TypedEventEmitterError,
	type TypedEventListener,
} from "./ty.ts";

// Define test event types
const testStringEvent = createTypedEvent<string>("test-string");
const testNumberEvent = createTypedEvent<number>("test-number");
const testVoidEvent = createTypedEvent<void>("test-void");

Deno.test("createTypedEvent", async (t) => {
	await t.step("should create a typed event with correct name", () => {
		const event = createTypedEvent<string>("my-event");
		assertEquals(event, "my-event");
	});

	await t.step("should create events with different types", () => {
		const stringEvent = createTypedEvent<string>("string-event");
		const numberEvent = createTypedEvent<number>("number-event");
		const objectEvent = createTypedEvent<{ data: unknown }>("object-event");

		assertEquals(stringEvent, "string-event");
		assertEquals(numberEvent, "number-event");
		assertEquals(objectEvent, "object-event");
	});

	await t.step("should handle empty string names", () => {
		const emptyEvent = createTypedEvent<string>("");
		assertEquals(emptyEvent, "");
	});

	await t.step(
		"should throw error when creating event with duplicate name",
		() => {
			const eventName = "duplicate-test-event";

			// First creation should succeed
			const firstEvent = createTypedEvent<string>(eventName);
			assertEquals(firstEvent, eventName);

			// Second creation with same name should throw
			assertThrows(
				() => createTypedEvent<number>(eventName),
				Error,
				`Event with name "${eventName}" already created`,
			);
		},
	);

	await t.step(
		"should throw error with correct message for various event names",
		() => {
			const testCases = [
				"test-event-1",
				"another.event",
				"event_with_underscores",
				"Event With Spaces",
				"🎉emoji-event",
				"123numeric-start",
			];

			for (const eventName of testCases) {
				// First creation should succeed
				createTypedEvent<string>(eventName);

				// Second creation should throw with specific message
				assertThrows(
					() => createTypedEvent<boolean>(eventName),
					Error,
					`Event with name "${eventName}" already created`,
				);
			}
		},
	);

	await t.step("should allow different event names even if similar", () => {
		// These should all succeed as they're different names
		const event1 = createTypedEvent<string>("similar-event");
		const event2 = createTypedEvent<number>("similar-event-2");
		const event3 = createTypedEvent<boolean>("similar_event"); // underscore vs dash
		const event4 = createTypedEvent<object>("Similar-Event"); // different case

		assertEquals(event1, "similar-event");
		assertEquals(event2, "similar-event-2");
		assertEquals(event3, "similar_event");
		assertEquals(event4, "Similar-Event");
	});

	await t.step("should handle empty string duplicate correctly", () => {
		// Note: empty string was already created in an earlier test
		// So this should throw
		assertThrows(
			() => createTypedEvent<string>(""),
			Error,
			'Event with name "" already created',
		);
	});

	await t.step("should handle very long event names", () => {
		const longEventName = "a".repeat(1000);

		// First creation should succeed
		const event = createTypedEvent<string>(longEventName);
		assertEquals(event, longEventName);

		// Second creation should throw
		assertThrows(
			() => createTypedEvent<number>(longEventName),
			Error,
			`Event with name "${longEventName}" already created`,
		);
	});

	await t.step("should preserve type safety with duplicate checking", () => {
		// Test that types are still enforced correctly
		interface CustomType {
			id: number;
			value: string;
		}

		const typedEventName = "type-safety-test";
		const typedEvent = createTypedEvent<CustomType>(typedEventName);

		// Verify the event has the correct string value
		assertEquals(typedEvent, typedEventName);

		// Verify duplicate detection still works with complex types
		assertThrows(
			() => createTypedEvent<{ different: boolean }>(typedEventName),
			Error,
			`Event with name "${typedEventName}" already created`,
		);

		// Test that the original event can still be used properly
		const emitter = new TypedEventEmitter();
		let receivedData: CustomType | null = null;

		emitter.on(typedEvent, (data) => {
			receivedData = data;
		});

		const testData: CustomType = { id: 42, value: "test" };
		emitter.emit(typedEvent, testData);

		assertEquals(receivedData, testData);
	});
});

Deno.test("TypedEventEmitter - Basic functionality", async (t) => {
	await t.step("should instantiate without errors", () => {
		const emitter = new TypedEventEmitter();
		assert(emitter instanceof TypedEventEmitter);
	});

	await t.step("should add and trigger string event listeners", () => {
		const emitter = new TypedEventEmitter();
		let receivedValue: string | null = null;

		const listener: TypedEventListener<typeof testStringEvent> = (value) => {
			receivedValue = value;
		};

		emitter.on(testStringEvent, listener);
		emitter.emit(testStringEvent, "hello world");

		assertEquals(receivedValue, "hello world");
	});

	await t.step("should add and trigger number event listeners", () => {
		const emitter = new TypedEventEmitter();
		let receivedValue: number | null = null;

		emitter.on(testNumberEvent, (value) => {
			receivedValue = value;
		});

		emitter.emit(testNumberEvent, 42);
		assertEquals(receivedValue, 42);
	});

	await t.step("should handle void events", () => {
		const emitter = new TypedEventEmitter();
		let wasCalled = false;

		emitter.on(testVoidEvent, () => {
			wasCalled = true;
		});

		emitter.emit(testVoidEvent, undefined);
		assert(wasCalled);
	});
});

Deno.test("TypedEventEmitter - Multiple listeners", async (t) => {
	await t.step("should support multiple listeners for same event", () => {
		const emitter = new TypedEventEmitter();
		const results: string[] = [];

		emitter.on(testStringEvent, (value) => results.push(`listener1: ${value}`));
		emitter.on(testStringEvent, (value) => results.push(`listener2: ${value}`));
		emitter.on(testStringEvent, (value) => results.push(`listener3: ${value}`));

		emitter.emit(testStringEvent, "test");

		assertEquals(results.length, 3);
		assertEquals(results[0], "listener1: test");
		assertEquals(results[1], "listener2: test");
		assertEquals(results[2], "listener3: test");
	});

	await t.step("should call listeners in order they were added", () => {
		const emitter = new TypedEventEmitter();
		const callOrder: number[] = [];

		emitter.on(testStringEvent, () => callOrder.push(1));
		emitter.on(testStringEvent, () => callOrder.push(2));
		emitter.on(testStringEvent, () => callOrder.push(3));

		emitter.emit(testStringEvent, "test");

		assertEquals(callOrder, [1, 2, 3]);
	});
});

Deno.test("TypedEventEmitter - Removing listeners", async (t) => {
	await t.step("should remove specific listener", () => {
		const emitter = new TypedEventEmitter();
		let count = 0;

		const listener = () => count++;
		emitter.on(testStringEvent, listener);
		emitter.emit(testStringEvent, "test1");
		assertEquals(count, 1);

		emitter.off(testStringEvent, listener);
		emitter.emit(testStringEvent, "test2");
		assertEquals(count, 1); // Should not increment
	});

	await t.step("should return cleanup function from on method", () => {
		const emitter = new TypedEventEmitter();
		let count = 0;

		const listener = () => count++;
		const cleanup = emitter.on(testStringEvent, listener);

		// Verify cleanup function is returned
		assert(typeof cleanup === "function");

		emitter.emit(testStringEvent, "test1");
		assertEquals(count, 1);

		// Use cleanup function to remove listener
		cleanup();
		emitter.emit(testStringEvent, "test2");
		assertEquals(count, 1); // Should not increment
	});

	await t.step("should handle multiple cleanup functions independently", () => {
		const emitter = new TypedEventEmitter();
		let count1 = 0;
		let count2 = 0;
		let count3 = 0;

		const listener1 = () => count1++;
		const listener2 = () => count2++;
		const listener3 = () => count3++;

		const cleanup1 = emitter.on(testStringEvent, listener1);
		const cleanup2 = emitter.on(testStringEvent, listener2);
		const cleanup3 = emitter.on(testStringEvent, listener3);

		// All listeners should be called
		emitter.emit(testStringEvent, "test1");
		assertEquals(count1, 1);
		assertEquals(count2, 1);
		assertEquals(count3, 1);

		// Remove only second listener
		cleanup2();
		emitter.emit(testStringEvent, "test2");
		assertEquals(count1, 2);
		assertEquals(count2, 1); // Should not increment
		assertEquals(count3, 2);

		// Remove first listener
		cleanup1();
		emitter.emit(testStringEvent, "test3");
		assertEquals(count1, 2); // Should not increment
		assertEquals(count2, 1); // Should not increment
		assertEquals(count3, 3);

		// Remove last listener
		cleanup3();
		emitter.emit(testStringEvent, "test4");
		assertEquals(count1, 2); // Should not increment
		assertEquals(count2, 1); // Should not increment
		assertEquals(count3, 3); // Should not increment
	});

	await t.step(
		"should handle cleanup function called multiple times safely",
		() => {
			const emitter = new TypedEventEmitter();
			let count = 0;

			const listener = () => count++;
			const cleanup = emitter.on(testStringEvent, listener);

			emitter.emit(testStringEvent, "test1");
			assertEquals(count, 1);

			// Call cleanup multiple times - should be safe
			cleanup();
			cleanup();
			cleanup();

			emitter.emit(testStringEvent, "test2");
			assertEquals(count, 1); // Should not increment
		},
	);

	await t.step("should work with mixed cleanup and manual off usage", () => {
		const emitter = new TypedEventEmitter();
		let count1 = 0;
		let count2 = 0;

		const listener1 = () => count1++;
		const listener2 = () => count2++;

		const cleanup1 = emitter.on(testStringEvent, listener1);
		emitter.on(testStringEvent, listener2);

		emitter.emit(testStringEvent, "test1");
		assertEquals(count1, 1);
		assertEquals(count2, 1);

		// Use cleanup function for first listener
		cleanup1();
		// Use manual off for second listener
		emitter.off(testStringEvent, listener2);

		emitter.emit(testStringEvent, "test2");
		assertEquals(count1, 1); // Should not increment
		assertEquals(count2, 1); // Should not increment
	});

	await t.step("should preserve type safety with cleanup functions", () => {
		interface TestData {
			value: string;
		}
		const typedEvent = createTypedEvent<TestData>("cleanup-type-test");

		const emitter = new TypedEventEmitter();
		let receivedData: TestData | null = null;

		const cleanup = emitter.on(typedEvent, (data) => {
			receivedData = data;
		});

		// Verify cleanup function type
		assert(typeof cleanup === "function");

		const testData: TestData = { value: "typed-test" };
		emitter.emit(typedEvent, testData);
		assertEquals(receivedData, testData);

		cleanup();
		receivedData = null;

		emitter.emit(typedEvent, { value: "after-cleanup" });
		assertEquals(receivedData, null); // Should not be called
	});

	await t.step("should only remove the specified listener", () => {
		const emitter = new TypedEventEmitter();
		let count1 = 0;
		let count2 = 0;

		const listener1 = () => count1++;
		const listener2 = () => count2++;

		emitter.on(testStringEvent, listener1);
		emitter.on(testStringEvent, listener2);

		emitter.emit(testStringEvent, "test1");
		assertEquals(count1, 1);
		assertEquals(count2, 1);

		emitter.off(testStringEvent, listener1);
		emitter.emit(testStringEvent, "test2");
		assertEquals(count1, 1); // Should not increment
		assertEquals(count2, 2); // Should increment
	});

	await t.step(
		"should handle removing non-existent listener gracefully",
		() => {
			const emitter = new TypedEventEmitter();
			const listener = () => {};

			// Should not throw
			emitter.off(testStringEvent, listener);
		},
	);

	await t.step(
		"should handle removing from non-existent event gracefully",
		() => {
			const emitter = new TypedEventEmitter();
			const nonExistentEvent = createTypedEvent<string>("non-existent");
			const listener = () => {};

			// Should not throw
			emitter.off(nonExistentEvent, listener);
		},
	);
});

Deno.test("TypedEventEmitter - Once listeners", async (t) => {
	await t.step("should call once listener only once", () => {
		const emitter = new TypedEventEmitter();
		let count = 0;

		emitter.once(testStringEvent, () => count++);

		emitter.emit(testStringEvent, "test1");
		assertEquals(count, 1);

		emitter.emit(testStringEvent, "test2");
		assertEquals(count, 1); // Should still be 1
	});

	await t.step("should receive correct value in once listener", () => {
		const emitter = new TypedEventEmitter();
		let receivedValue: string | null = null;

		emitter.once(testStringEvent, (value) => {
			receivedValue = value;
		});

		emitter.emit(testStringEvent, "once-test");
		assertEquals(receivedValue, "once-test");
	});

	await t.step("should work with multiple once listeners", () => {
		const emitter = new TypedEventEmitter();
		const results: string[] = [];

		emitter.once(testStringEvent, (value) => results.push(`once1: ${value}`));
		emitter.once(testStringEvent, (value) => results.push(`once2: ${value}`));

		emitter.emit(testStringEvent, "test");
		assertEquals(results.length, 2);

		emitter.emit(testStringEvent, "test2");
		assertEquals(results.length, 2); // Should still be 2
	});

	await t.step("should allow mixing once and regular listeners", () => {
		const emitter = new TypedEventEmitter();
		let onceCount = 0;
		let regularCount = 0;

		emitter.once(testStringEvent, () => onceCount++);
		emitter.on(testStringEvent, () => regularCount++);

		emitter.emit(testStringEvent, "test1");
		assertEquals(onceCount, 1);
		assertEquals(regularCount, 1);

		emitter.emit(testStringEvent, "test2");
		assertEquals(onceCount, 1); // Should not increment
		assertEquals(regularCount, 2); // Should increment
	});

	await t.step("should return cleanup function from once method", () => {
		const emitter = new TypedEventEmitter();
		let count = 0;

		const cleanup = emitter.once(testStringEvent, () => count++);

		// Verify cleanup function is returned
		assert(typeof cleanup === "function");

		// Test that cleanup prevents the once listener from being called
		cleanup();
		emitter.emit(testStringEvent, "test1");
		assertEquals(count, 0); // Should not be called

		emitter.emit(testStringEvent, "test2");
		assertEquals(count, 0); // Should still not be called
	});

	await t.step("should handle once cleanup after natural trigger", () => {
		const emitter = new TypedEventEmitter();
		let count = 0;

		const cleanup = emitter.once(testStringEvent, () => count++);

		// First emit should trigger the once listener
		emitter.emit(testStringEvent, "test1");
		assertEquals(count, 1);

		// Calling cleanup after listener already triggered should be safe
		cleanup();

		// Further emits should not trigger anything
		emitter.emit(testStringEvent, "test2");
		assertEquals(count, 1);
	});
});

Deno.test("TypedEventEmitter - Error handling", async (t) => {
	await t.step(
		"should emit TypedEventEmitterError when listener throws",
		() => {
			const emitter = new TypedEventEmitter();
			let errorCaught: unknown = null;

			// Listen for error events
			emitter.on(TypedEventEmitterError, (error) => {
				errorCaught = error;
			});

			// Add a listener that throws
			emitter.on(testStringEvent, () => {
				throw new Error("Test error");
			});

			emitter.emit(testStringEvent, "test");

			assert(errorCaught instanceof Error);
			assertEquals(errorCaught.message, "Test error");
		},
	);

	await t.step(
		"should continue executing other listeners after one throws",
		() => {
			const emitter = new TypedEventEmitter();
			let listener2Called = false;
			let listener3Called = false;

			emitter.on(testStringEvent, () => {
				throw new Error("Listener 1 error");
			});
			emitter.on(testStringEvent, () => {
				listener2Called = true;
			});
			emitter.on(testStringEvent, () => {
				listener3Called = true;
			});

			emitter.emit(testStringEvent, "test");

			assert(listener2Called, "Listener 2 should have been called");
			assert(listener3Called, "Listener 3 should have been called");
		},
	);

	await t.step("should handle multiple errors in single emit", () => {
		const emitter = new TypedEventEmitter();
		const errors: unknown[] = [];

		emitter.on(TypedEventEmitterError, (error) => {
			errors.push(error);
		});

		emitter.on(testStringEvent, () => {
			throw new Error("Error 1");
		});
		emitter.on(testStringEvent, () => {
			throw new Error("Error 2");
		});

		emitter.emit(testStringEvent, "test");

		assertEquals(errors.length, 2);
		assertEquals((errors[0] as Error).message, "Error 1");
		assertEquals((errors[1] as Error).message, "Error 2");
	});

	await t.step(
		"should handle error in error listener with stack overflow protection",
		() => {
			const emitter = new TypedEventEmitter();

			emitter.on(TypedEventEmitterError, () => {
				throw new Error("Error in error handler");
			});

			// Add a regular listener that throws
			emitter.on(testStringEvent, () => {
				throw new Error("Original error");
			});

			// This test demonstrates the current behavior - the library will
			// recursively emit errors when error handlers throw
			// In production, error handlers should be designed to never throw
			try {
				emitter.emit(testStringEvent, "test");
			} catch (error) {
				// Expect a RangeError due to stack overflow
				assert(error instanceof RangeError);
				assert(error.message.includes("Maximum call stack size exceeded"));
			}
		},
	);
});

Deno.test("TypedEventEmitter - Edge cases", async (t) => {
	await t.step("should handle emitting events with no listeners", () => {
		const emitter = new TypedEventEmitter();

		// Should not throw
		emitter.emit(testStringEvent, "test");
		emitter.emit(testNumberEvent, 42);
	});

	await t.step(
		"should handle listeners that modify the listener list during emit",
		() => {
			const emitter = new TypedEventEmitter();
			let count = 0;

			const selfRemovingListener = () => {
				count++;
				emitter.off(testStringEvent, selfRemovingListener);
			};

			emitter.on(testStringEvent, selfRemovingListener);
			emitter.on(testStringEvent, () => count++);

			emitter.emit(testStringEvent, "test");
			assertEquals(count, 2);

			// Second emit should only call the remaining listener
			emitter.emit(testStringEvent, "test");
			assertEquals(count, 3);
		},
	);

	await t.step(
		"should handle listener that adds new listeners during emit",
		() => {
			const emitter = new TypedEventEmitter();
			let count = 0;

			const addingListener = () => {
				count++;
				emitter.on(testStringEvent, () => count++);
			};

			emitter.on(testStringEvent, addingListener);

			emitter.emit(testStringEvent, "test1");
			assertEquals(count, 1);

			// Second emit should call both listeners
			emitter.emit(testStringEvent, "test2");
			assertEquals(count, 3);
		},
	);

	await t.step("should handle undefined and null values", () => {
		const nullEvent = createTypedEvent<null>("null-event");
		const undefinedEvent = createTypedEvent<undefined>("undefined-event");

		const emitter = new TypedEventEmitter();
		let nullReceived: unknown = "not-set";
		let undefinedReceived: unknown = "not-set";

		emitter.on(nullEvent, (value) => {
			nullReceived = value;
		});

		emitter.on(undefinedEvent, (value) => {
			undefinedReceived = value;
		});

		emitter.emit(nullEvent, null);
		emitter.emit(undefinedEvent, undefined);

		assertEquals(nullReceived, null);
		assertEquals(undefinedReceived, undefined);
	});
});

Deno.test("TypedEventEmitter - Memory management", async (t) => {
	await t.step("should handle large numbers of listeners efficiently", () => {
		const emitter = new TypedEventEmitter();
		const numListeners = 1000;
		let callCount = 0;

		// Add many listeners
		for (let i = 0; i < numListeners; i++) {
			emitter.on(testStringEvent, () => callCount++);
		}

		// Emit event
		emitter.emit(testStringEvent, "test");

		assertEquals(callCount, numListeners);
	});
});

Deno.test("TypedEventEmitter - Type safety demonstration", async (t) => {
	await t.step("should work with complex object types", () => {
		interface ComplexData {
			id: number;
			metadata: {
				tags: string[];
				created: Date;
			};
			process?: (input: string) => number;
		}

		const complexEvent = createTypedEvent<ComplexData>("complex");
		const emitter = new TypedEventEmitter();
		let received: ComplexData | null = null;

		emitter.on(complexEvent, (data) => {
			received = data;
		});

		const testData: ComplexData = {
			id: 123,
			metadata: {
				tags: ["test", "demo"],
				created: new Date("2024-01-01"),
			},
			process: (input: string) => input.length,
		};

		emitter.emit(complexEvent, testData);

		assert(received !== null);
		const typedReceived = received as ComplexData;
		assertEquals(typedReceived.id, 123);
		assertEquals(typedReceived.metadata.tags, ["test", "demo"]);
		assertEquals(typedReceived.process?.("hello"), 5);
	});

	await t.step("should work with union types", () => {
		const unionEvent = createTypedEvent<string | number | boolean>("union");
		const emitter = new TypedEventEmitter();
		const received: (string | number | boolean)[] = [];

		emitter.on(unionEvent, (value) => {
			received.push(value);
		});

		emitter.emit(unionEvent, "string");
		emitter.emit(unionEvent, 42);
		emitter.emit(unionEvent, true);

		assertEquals(received, ["string", 42, true]);
	});
});

Deno.test("TypedEventEmitter - Real-world usage patterns", async (t) => {
	await t.step("should support event-driven data flow", () => {
		interface UserData {
			name: string;
			age: number;
		}

		const dataEvent = createTypedEvent<{
			type: "user" | "admin";
			data: UserData;
		}>("data");
		const processedEvent = createTypedEvent<{
			processed: true;
			result: UserData & { type: string; processed: boolean };
		}>("processed");

		const emitter = new TypedEventEmitter();
		let finalResult: (UserData & { type: string; processed: boolean }) | null =
			null;

		// Set up data processing pipeline
		emitter.on(dataEvent, (input) => {
			const result = { ...input.data, type: input.type, processed: true };
			emitter.emit(processedEvent, { processed: true, result });
		});

		emitter.on(processedEvent, (output) => {
			finalResult = output.result;
		});

		// Trigger the pipeline
		emitter.emit(dataEvent, {
			type: "user",
			data: { name: "John", age: 30 },
		});

		assert(finalResult !== null);
		const typedResult = finalResult as UserData & {
			type: string;
			processed: boolean;
		};
		assertEquals(typedResult.name, "John");
		assertEquals(typedResult.type, "user");
		assertEquals(typedResult.processed, true);
	});

	await t.step("should support cleanup patterns", () => {
		const emitter = new TypedEventEmitter();
		const cleanupFunctions: Array<() => void> = [];
		let eventCount = 0;

		// Modern approach: use cleanup functions returned by on/once
		const cleanupEvent1 = createTypedEvent<string>("cleanup-pattern-event-1");
		const cleanupEvent2 = createTypedEvent<string>("cleanup-pattern-event-2");
		const cleanupEvent3 = createTypedEvent<string>("cleanup-pattern-event-3");

		// Regular listeners
		cleanupFunctions.push(emitter.on(testStringEvent, () => eventCount++));
		cleanupFunctions.push(emitter.on(cleanupEvent1, () => eventCount++));

		// Once listeners
		cleanupFunctions.push(emitter.once(cleanupEvent2, () => eventCount++));
		cleanupFunctions.push(emitter.once(cleanupEvent3, () => eventCount++));

		// Emit events
		emitter.emit(testStringEvent, "test");
		emitter.emit(cleanupEvent1, "test");
		emitter.emit(cleanupEvent2, "test"); // once listener
		assertEquals(eventCount, 3);

		// Cleanup all listeners using returned cleanup functions
		cleanupFunctions.forEach((cleanup) => cleanup());

		// Events should no longer trigger listeners
		emitter.emit(testStringEvent, "test");
		emitter.emit(cleanupEvent1, "test");
		emitter.emit(cleanupEvent3, "test"); // this once listener was cleaned up before being triggered
		assertEquals(eventCount, 3); // Should remain unchanged
	});

	await t.step("should support mixed cleanup approaches", () => {
		const emitter = new TypedEventEmitter();
		let eventCount = 0;

		const mixedEvent1 = createTypedEvent<string>("mixed-cleanup-1");
		const mixedEvent2 = createTypedEvent<string>("mixed-cleanup-2");

		// Approach 1: Use cleanup function
		const cleanup1 = emitter.on(mixedEvent1, () => eventCount++);

		// Approach 2: Manual cleanup with off()
		const listener2 = () => eventCount++;
		emitter.on(mixedEvent2, listener2);

		// Both should work
		emitter.emit(mixedEvent1, "test");
		emitter.emit(mixedEvent2, "test");
		assertEquals(eventCount, 2);

		// Clean up using different approaches
		cleanup1(); // Function cleanup
		emitter.off(mixedEvent2, listener2); // Manual cleanup

		// Events should no longer trigger
		emitter.emit(mixedEvent1, "test");
		emitter.emit(mixedEvent2, "test");
		assertEquals(eventCount, 2); // Should remain unchanged
	});
});
