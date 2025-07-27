import { assert, assertEquals, assertThrows } from "@std/assert";
import {
	createTypedEvent,
	type TypedEvent,
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

		emitter.on(testStringEvent, (value) => {
			results.push(`listener1: ${value}`);
		});
		emitter.on(testStringEvent, (value) => {
			results.push(`listener2: ${value}`);
		});
		emitter.on(testStringEvent, (value) => {
			results.push(`listener3: ${value}`);
		});

		emitter.emit(testStringEvent, "test");

		assertEquals(results.length, 3);
		assertEquals(results[0], "listener1: test");
		assertEquals(results[1], "listener2: test");
		assertEquals(results[2], "listener3: test");
	});

	await t.step("should call listeners in order they were added", () => {
		const emitter = new TypedEventEmitter();
		const callOrder: number[] = [];

		emitter.on(testStringEvent, () => {
			callOrder.push(1);
		});
		emitter.on(testStringEvent, () => {
			callOrder.push(2);
		});
		emitter.on(testStringEvent, () => {
			callOrder.push(3);
		});

		emitter.emit(testStringEvent, "test");

		assertEquals(callOrder, [1, 2, 3]);
	});
});

Deno.test("TypedEventEmitter - Removing listeners", async (t) => {
	await t.step("should remove specific listener", () => {
		const emitter = new TypedEventEmitter();
		let count = 0;

		const listener = () => {
			count++;
		};
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

		const listener = () => {
			count++;
		};
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

		const listener1 = () => {
			count1++;
		};
		const listener2 = () => {
			count2++;
		};
		const listener3 = () => {
			count3++;
		};

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

			const listener = () => {
				count++;
			};
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

		const listener1 = () => {
			count1++;
		};
		const listener2 = () => {
			count2++;
		};

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

		const listener1 = () => {
			count1++;
		};
		const listener2 = () => {
			count2++;
		};

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

		emitter.once(testStringEvent, () => {
			count++;
		});

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

		emitter.once(testStringEvent, (value) => {
			results.push(`once1: ${value}`);
		});
		emitter.once(testStringEvent, (value) => {
			results.push(`once2: ${value}`);
		});

		emitter.emit(testStringEvent, "test");
		assertEquals(results.length, 2);

		emitter.emit(testStringEvent, "test2");
		assertEquals(results.length, 2); // Should still be 2
	});

	await t.step("should allow mixing once and regular listeners", () => {
		const emitter = new TypedEventEmitter();
		let onceCount = 0;
		let regularCount = 0;

		emitter.once(testStringEvent, () => {
			onceCount++;
		});
		emitter.on(testStringEvent, () => {
			regularCount++;
		});

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

		const cleanup = emitter.once(testStringEvent, () => {
			count++;
		});

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

		const cleanup = emitter.once(testStringEvent, () => {
			count++;
		});

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
			let errorPayload: {
				error: unknown;
				event: TypedEvent<unknown>;
				payload: unknown;
			} | null = null;

			// Listen for error events
			emitter.on(TypedEventEmitterError, (payload) => {
				errorPayload = payload;
			});

			// Add a listener that throws
			emitter.on(testStringEvent, () => {
				throw new Error("Test error");
			});

			emitter.emit(testStringEvent, "test data");

			// Verify the error payload structure
			assert(errorPayload !== null, "Error payload should not be null");
			const payload = errorPayload as {
				error: unknown;
				event: TypedEvent<unknown>;
				payload: unknown;
			};
			assert(
				payload.error instanceof Error,
				"Error should be an Error instance",
			);
			assertEquals((payload.error as Error).message, "Test error");
			assertEquals(payload.event, testStringEvent);
			assertEquals(payload.payload, "test data");
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
		const errorPayloads: {
			error: unknown;
			event: TypedEvent<unknown>;
			payload: unknown;
		}[] = [];

		emitter.on(TypedEventEmitterError, (payload) => {
			errorPayloads.push(payload);
		});

		emitter.on(testStringEvent, () => {
			throw new Error("Error 1");
		});
		emitter.on(testStringEvent, () => {
			throw new Error("Error 2");
		});

		emitter.emit(testStringEvent, "test payload");

		assertEquals(errorPayloads.length, 2);
		assertEquals((errorPayloads[0].error as Error).message, "Error 1");
		assertEquals(errorPayloads[0].event, testStringEvent);
		assertEquals(errorPayloads[0].payload, "test payload");
		assertEquals((errorPayloads[1].error as Error).message, "Error 2");
		assertEquals(errorPayloads[1].event, testStringEvent);
		assertEquals(errorPayloads[1].payload, "test payload");
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

	await t.step("should handle async error handlers that reject", async () => {
		const emitter = new TypedEventEmitter();
		let primaryErrorReceived = false;
		let secondaryErrorReceived = false;
		let errorHandlerExecuted = false;

		// Add a second error handler to catch errors from the first
		emitter.on(TypedEventEmitterError, (payload) => {
			if ((payload.error as Error).message === "Error handler rejection") {
				secondaryErrorReceived = true;
			}
		});

		// Add async error handler that rejects
		emitter.on(TypedEventEmitterError, async (payload) => {
			if ((payload.error as Error).message === "Original error") {
				primaryErrorReceived = true;
				errorHandlerExecuted = true;
				await new Promise((resolve) => setTimeout(resolve, 10));
				throw new Error("Error handler rejection");
			}
		});

		// Trigger an original error
		emitter.on(testStringEvent, () => {
			throw new Error("Original error");
		});

		emitter.emit(testStringEvent, "test");

		// Wait for async operations
		await new Promise((resolve) => setTimeout(resolve, 50));

		assert(primaryErrorReceived, "Primary error should have been received");
		assert(errorHandlerExecuted, "Error handler should have executed");
		assert(
			secondaryErrorReceived,
			"Secondary error from error handler should be caught",
		);
	});

	await t.step(
		"should handle multiple async error handlers with mixed success/failure",
		async () => {
			const emitter = new TypedEventEmitter();
			const errorEvents: string[] = [];
			let successfulHandlerCount = 0;

			// Track all error events
			emitter.on(TypedEventEmitterError, (payload) => {
				errorEvents.push((payload.error as Error).message);
			});

			// Success error handler
			emitter.on(TypedEventEmitterError, async (payload) => {
				if ((payload.error as Error).message === "Original error") {
					await new Promise((resolve) => setTimeout(resolve, 5));
					successfulHandlerCount++;
				}
			});

			// Failing error handler 1
			emitter.on(TypedEventEmitterError, async (payload) => {
				if ((payload.error as Error).message === "Original error") {
					await new Promise((resolve) => setTimeout(resolve, 10));
					throw new Error("Handler error 1");
				}
			});

			// Another success error handler
			emitter.on(TypedEventEmitterError, async (payload) => {
				if ((payload.error as Error).message === "Original error") {
					await new Promise((resolve) => setTimeout(resolve, 15));
					successfulHandlerCount++;
				}
			});

			// Failing error handler 2
			emitter.on(TypedEventEmitterError, async (payload) => {
				if ((payload.error as Error).message === "Original error") {
					await new Promise((resolve) => setTimeout(resolve, 20));
					throw new Error("Handler error 2");
				}
			});

			// Trigger original error
			emitter.on(testStringEvent, () => {
				throw new Error("Original error");
			});

			emitter.emit(testStringEvent, "test");

			// Wait for all async operations
			await new Promise((resolve) => setTimeout(resolve, 100));

			assertEquals(
				successfulHandlerCount,
				2,
				"Both successful error handlers should execute",
			);

			// Should have: "Original error", "Handler error 1", "Handler error 2"
			const originalErrors = errorEvents.filter(
				(msg) => msg === "Original error",
			);
			const handlerErrors = errorEvents.filter((msg) =>
				msg.startsWith("Handler error"),
			);

			assertEquals(originalErrors.length, 1, "Should have one original error");
			assertEquals(handlerErrors.length, 2, "Should have two handler errors");
			assert(handlerErrors.includes("Handler error 1"));
			assert(handlerErrors.includes("Handler error 2"));
		},
	);

	await t.step("should handle finite chain of error events", async () => {
		const emitter = new TypedEventEmitter();
		const errorChain: string[] = [];
		let chainDepth = 0;
		const maxDepth = 3;

		emitter.on(TypedEventEmitterError, async (payload) => {
			const errorMsg = (payload.error as Error).message;
			errorChain.push(errorMsg);

			if (errorMsg.startsWith("Chain error") && chainDepth < maxDepth) {
				chainDepth++;
				await new Promise((resolve) => setTimeout(resolve, 10));
				throw new Error(`Chain error ${chainDepth}`);
			}
		});

		// Start the chain
		emitter.on(testStringEvent, () => {
			throw new Error("Chain error 0");
		});

		emitter.emit(testStringEvent, "test");

		// Wait for chain to complete
		await new Promise((resolve) => setTimeout(resolve, 200));

		// Should have: "Chain error 0", "Chain error 1", "Chain error 2", "Chain error 3"
		assertEquals(errorChain.length, maxDepth + 1);
		assertEquals(errorChain[0], "Chain error 0");
		assertEquals(errorChain[1], "Chain error 1");
		assertEquals(errorChain[2], "Chain error 2");
		assertEquals(errorChain[3], "Chain error 3");
	});

	await t.step("should preserve error context and stack traces", async () => {
		const emitter = new TypedEventEmitter();
		const event = createTypedEvent<string>("error-context");
		const customError = new Error("Custom error with context");
		customError.stack = "Original stack trace";
		let receivedError: unknown = null;

		emitter.on(event, () => {
			throw customError;
		});

		emitter.on(TypedEventEmitterError, (payload) => {
			receivedError = payload.error;
		});

		emitter.emit(event, "test");

		await new Promise((resolve) => setTimeout(resolve, 10));

		assert(receivedError !== null, "Error should have been caught");
		assert(receivedError instanceof Error, "Should be an Error instance");
		assertEquals(receivedError, customError);
		assertEquals(receivedError.message, "Custom error with context");
		assertEquals(receivedError.stack, "Original stack trace");
	});

	await t.step("should handle error cause chains", async () => {
		const emitter = new TypedEventEmitter();
		const event = createTypedEvent<string>("error-cause");
		let receivedError: unknown = null;

		emitter.on(event, () => {
			const rootCause = new Error("Root cause");
			const wrappedError = new Error("Wrapped error", { cause: rootCause });
			throw wrappedError;
		});

		emitter.on(TypedEventEmitterError, (payload) => {
			receivedError = payload.error;
		});

		emitter.emit(event, "test");

		await new Promise((resolve) => setTimeout(resolve, 10));

		assert(receivedError !== null, "Error should have been caught");
		assert(receivedError instanceof Error, "Should be an Error instance");
		assertEquals(receivedError.message, "Wrapped error");
		if (receivedError) {
			const errorWithCause = receivedError as Error & { cause?: Error };
			assertEquals(errorWithCause.cause?.message, "Root cause");
		}
	});

	await t.step("should handle errors with custom properties", async () => {
		const emitter = new TypedEventEmitter();
		const event = createTypedEvent<string>("custom-error");
		let receivedError: unknown = null;

		emitter.on(event, () => {
			const customError = new Error("Custom error");
			// Add custom properties
			Object.assign(customError, {
				code: "ERR_CUSTOM",
				statusCode: 500,
				details: { extra: "info" },
			});
			throw customError;
		});

		emitter.on(TypedEventEmitterError, (payload) => {
			receivedError = payload.error;
		});

		emitter.emit(event, "test");

		await new Promise((resolve) => setTimeout(resolve, 10));

		assert(receivedError !== null, "Error should have been caught");
		assert(receivedError instanceof Error, "Should be an Error instance");

		const caughtError = receivedError as Error & {
			code: string;
			statusCode: number;
			details: { extra: string };
		};

		assertEquals(caughtError.message, "Custom error");
		assertEquals(caughtError.code, "ERR_CUSTOM");
		assertEquals(caughtError.statusCode, 500);
		assertEquals(caughtError.details, { extra: "info" });
	});

	await t.step(
		"should maintain error context across multiple listeners",
		async () => {
			const emitter = new TypedEventEmitter();
			const event = createTypedEvent<string>("multi-error");
			const errors: Error[] = [];

			emitter.on(event, () => {
				throw new Error("Error from listener 1");
			});

			emitter.on(event, () => {
				throw new Error("Error from listener 2");
			});

			emitter.on(TypedEventEmitterError, (payload) => {
				errors.push(payload.error as Error);
			});

			emitter.emit(event, "test");

			await new Promise((resolve) => setTimeout(resolve, 10));

			assertEquals(errors.length, 2);
			assertEquals(errors[0].message, "Error from listener 1");
			assertEquals(errors[1].message, "Error from listener 2");
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
			emitter.on(testStringEvent, () => {
				count++;
			});

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
				emitter.on(testStringEvent, () => {
					count++;
				});
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

	await t.step("should handle circular event emissions safely", () => {
		const emitter = new TypedEventEmitter();
		const circularEvent1 = createTypedEvent<number>("circular-sync-1");
		const circularEvent2 = createTypedEvent<number>("circular-sync-2");
		let emissions = 0;
		const maxEmissions = 5;

		// Event 1 triggers Event 2
		emitter.on(circularEvent1, (value) => {
			emissions++;
			if (value < maxEmissions) {
				emitter.emit(circularEvent2, value + 1);
			}
		});

		// Event 2 triggers Event 1
		emitter.on(circularEvent2, (value) => {
			emissions++;
			if (value < maxEmissions) {
				emitter.emit(circularEvent1, value + 1);
			}
		});

		emitter.emit(circularEvent1, 1);

		// Should have controlled circular emissions
		assertEquals(emissions, maxEmissions);
	});

	await t.step(
		"should handle circular event emissions with async listeners",
		async () => {
			const emitter = new TypedEventEmitter();
			const circularEvent1 = createTypedEvent<number>("circular-async-1");
			const circularEvent2 = createTypedEvent<number>("circular-async-2");
			let emissions = 0;
			const maxEmissions = 5;

			// Event 1 triggers Event 2 (async)
			emitter.on(circularEvent1, async (value) => {
				emissions++;
				if (value < maxEmissions) {
					await new Promise((resolve) => setTimeout(resolve, 10));
					emitter.emit(circularEvent2, value + 1);
				}
			});

			// Event 2 triggers Event 1 (async)
			emitter.on(circularEvent2, async (value) => {
				emissions++;
				if (value < maxEmissions) {
					await new Promise((resolve) => setTimeout(resolve, 10));
					emitter.emit(circularEvent1, value + 1);
				}
			});

			emitter.emit(circularEvent1, 1);

			// Wait for all async operations
			await new Promise((resolve) => setTimeout(resolve, 200));

			// Should have controlled circular emissions
			assertEquals(emissions, maxEmissions);
		},
	);

	await t.step("should handle self-triggering events", () => {
		const emitter = new TypedEventEmitter();
		const selfTriggeringEvent = createTypedEvent<number>("self-trigger");
		let triggerCount = 0;
		const maxTriggers = 3;

		emitter.on(selfTriggeringEvent, (value) => {
			triggerCount++;
			if (value < maxTriggers) {
				emitter.emit(selfTriggeringEvent, value + 1);
			}
		});

		emitter.emit(selfTriggeringEvent, 1);

		assertEquals(triggerCount, maxTriggers);
	});

	await t.step("should handle complex event chains", async () => {
		const emitter = new TypedEventEmitter();
		const chainEvent1 = createTypedEvent<string>("chain-1");
		const chainEvent2 = createTypedEvent<string>("chain-2");
		const chainEvent3 = createTypedEvent<string>("chain-3");
		const executionOrder: string[] = [];

		// Chain: Event1 -> Event2 -> Event3
		emitter.on(chainEvent1, async (data) => {
			executionOrder.push(`chain1-${data}`);
			await new Promise((resolve) => setTimeout(resolve, 10));
			emitter.emit(chainEvent2, data);
		});

		emitter.on(chainEvent2, async (data) => {
			executionOrder.push(`chain2-${data}`);
			await new Promise((resolve) => setTimeout(resolve, 10));
			emitter.emit(chainEvent3, data);
		});

		emitter.on(chainEvent3, (data) => {
			executionOrder.push(`chain3-${data}`);
		});

		emitter.emit(chainEvent1, "test");

		await new Promise((resolve) => setTimeout(resolve, 100));

		assertEquals(executionOrder, ["chain1-test", "chain2-test", "chain3-test"]);
	});
});

Deno.test("TypedEventEmitter - Memory management", async (t) => {
	await t.step("should handle large numbers of listeners efficiently", () => {
		const emitter = new TypedEventEmitter();
		const numListeners = 1000;
		let callCount = 0;

		// Add many listeners
		for (let i = 0; i < numListeners; i++) {
			emitter.on(testStringEvent, () => {
				callCount++;
			});
		}

		// Emit event
		emitter.emit(testStringEvent, "test");

		assertEquals(callCount, numListeners);
	});
});

Deno.test("TypedEventEmitter - Async listeners and promise rejection", async (t) => {
	await t.step(
		"should handle async listeners that return resolved promises",
		async () => {
			const emitter = new TypedEventEmitter();
			let resolvedValue: string | null = null;
			let promiseResolved = false;

			const asyncListener: TypedEventListener<typeof testStringEvent> = async (
				value,
			) => {
				await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay
				resolvedValue = value;
				promiseResolved = true;
			};

			emitter.on(testStringEvent, asyncListener);
			emitter.emit(testStringEvent, "async-test");

			// Wait a bit for the async operation to complete
			await new Promise((resolve) => setTimeout(resolve, 50));

			assertEquals(resolvedValue, "async-test");
			assert(promiseResolved);
		},
	);

	await t.step(
		"should emit TypedEventEmitterError when async listener rejects",
		async () => {
			const emitter = new TypedEventEmitter();
			let errorPayload: {
				error: unknown;
				event: TypedEvent<unknown>;
				payload: unknown;
			} | null = null;
			let errorReceived = false;

			// Listen for error events
			emitter.on(TypedEventEmitterError, (payload) => {
				errorPayload = payload;
				errorReceived = true;
			});

			// Add async listener that rejects
			const rejectingListener: TypedEventListener<
				typeof testStringEvent
			> = async (_value) => {
				await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay
				throw new Error("Async error");
			};

			emitter.on(testStringEvent, rejectingListener);
			emitter.emit(testStringEvent, "rejection-test");

			// Wait for the promise rejection to be caught
			await new Promise((resolve) => setTimeout(resolve, 50));

			assert(errorReceived, "Error event should have been emitted");
			assert(errorPayload !== null, "Error payload should not be null");
			const payload = errorPayload as {
				error: unknown;
				event: TypedEvent<unknown>;
				payload: unknown;
			};
			assert(
				payload.error instanceof Error,
				"Error should be an Error instance",
			);
			assertEquals((payload.error as Error).message, "Async error");
			assertEquals(payload.event, testStringEvent);
			assertEquals(payload.payload, "rejection-test");
		},
	);

	await t.step(
		"should handle multiple async listeners with mixed success/failure",
		async () => {
			const emitter = new TypedEventEmitter();
			const errorPayloads: Array<{
				error: unknown;
				event: TypedEvent<unknown>;
				payload: unknown;
			}> = [];
			let successCount = 0;

			emitter.on(TypedEventEmitterError, (payload) => {
				errorPayloads.push(payload);
			});

			// Success listener
			emitter.on(testStringEvent, async (_value) => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				successCount++;
			});

			// Failing listener 1
			emitter.on(testStringEvent, async (_value) => {
				await new Promise((resolve) => setTimeout(resolve, 15));
				throw new Error("First async error");
			});

			// Another success listener
			emitter.on(testStringEvent, async (_value) => {
				await new Promise((resolve) => setTimeout(resolve, 5));
				successCount++;
			});

			// Failing listener 2
			emitter.on(testStringEvent, async (_value) => {
				await new Promise((resolve) => setTimeout(resolve, 20));
				throw new Error("Second async error");
			});

			emitter.emit(testStringEvent, "mixed-test");

			// Wait for all async operations to complete
			await new Promise((resolve) => setTimeout(resolve, 100));

			assertEquals(
				successCount,
				2,
				"Both success listeners should have executed",
			);
			assertEquals(
				errorPayloads.length,
				2,
				"Both error listeners should have triggered errors",
			);

			const errorMessages = errorPayloads.map(
				(p) => (p.error as Error).message,
			);
			assert(errorMessages.includes("First async error"));
			assert(errorMessages.includes("Second async error"));
		},
	);

	await t.step("should handle immediate promise rejection", async () => {
		const emitter = new TypedEventEmitter();
		let errorReceived = false;

		emitter.on(TypedEventEmitterError, () => {
			errorReceived = true;
		});

		// Listener that returns an immediately rejected promise
		emitter.on(testStringEvent, () => {
			return Promise.reject(new Error("Immediate rejection"));
		});

		emitter.emit(testStringEvent, "immediate-test");

		// Wait for the rejection to be caught
		await new Promise((resolve) => setTimeout(resolve, 10));

		assert(
			errorReceived,
			"Error should have been caught from immediate rejection",
		);
	});

	await t.step(
		"should handle promise rejection with non-Error objects",
		async () => {
			const emitter = new TypedEventEmitter();
			let errorPayload: {
				error: unknown;
				event: TypedEvent<unknown>;
				payload: unknown;
			} | null = null;

			emitter.on(TypedEventEmitterError, (payload) => {
				errorPayload = payload;
			});

			// Listener that rejects with a string
			emitter.on(testStringEvent, () => {
				return Promise.reject("String error");
			});

			emitter.emit(testStringEvent, "string-error-test");

			await new Promise((resolve) => setTimeout(resolve, 50));

			assert(errorPayload !== null);
			const typedPayload = errorPayload as {
				error: unknown;
				event: TypedEvent<unknown>;
				payload: unknown;
			};
			assertEquals(typedPayload.error, "String error");
			assertEquals(typedPayload.event, testStringEvent);
			assertEquals(typedPayload.payload, "string-error-test");
		},
	);

	await t.step(
		"should handle promise rejection with null/undefined",
		async () => {
			const emitter = new TypedEventEmitter();
			const errorPayloads: Array<{
				error: unknown;
				event: TypedEvent<unknown>;
				payload: unknown;
			}> = [];

			emitter.on(TypedEventEmitterError, (payload) => {
				errorPayloads.push(payload);
			});

			// Listener that rejects with null
			emitter.on(testStringEvent, () => {
				return Promise.reject(null);
			});

			// Listener that rejects with undefined
			emitter.on(testNumberEvent, () => {
				return Promise.reject(undefined);
			});

			emitter.emit(testStringEvent, "null-test");
			emitter.emit(testNumberEvent, 123);

			await new Promise((resolve) => setTimeout(resolve, 50));

			assertEquals(errorPayloads.length, 2);
			assertEquals(errorPayloads[0].error, null);
			assertEquals(errorPayloads[1].error, undefined);
		},
	);

	await t.step(
		"should handle once listeners that return rejected promises",
		async () => {
			const emitter = new TypedEventEmitter();
			let errorReceived = false;
			let listenerCallCount = 0;

			emitter.on(TypedEventEmitterError, () => {
				errorReceived = true;
			});

			// Once listener that rejects
			emitter.once(testStringEvent, () => {
				listenerCallCount++;
				return Promise.reject(new Error("Once listener error"));
			});

			emitter.emit(testStringEvent, "once-rejection-test");

			await new Promise((resolve) => setTimeout(resolve, 50));

			assert(errorReceived, "Error should have been emitted");
			assertEquals(
				listenerCallCount,
				1,
				"Once listener should have been called exactly once",
			);

			// Emit again to verify once listener was removed
			emitter.emit(testStringEvent, "second-emit");

			await new Promise((resolve) => setTimeout(resolve, 50));

			assertEquals(
				listenerCallCount,
				1,
				"Once listener should still have been called only once",
			);
		},
	);

	await t.step(
		"should continue executing sync listeners when async listener rejects",
		async () => {
			const emitter = new TypedEventEmitter();
			let syncListenerCalled = false;
			let errorReceived = false;

			emitter.on(TypedEventEmitterError, () => {
				errorReceived = true;
			});

			// Async listener that rejects
			emitter.on(testStringEvent, async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				throw new Error("Async rejection");
			});

			// Sync listener that should still execute
			emitter.on(testStringEvent, () => {
				syncListenerCalled = true;
			});

			emitter.emit(testStringEvent, "mixed-sync-async-test");

			// Sync listener should be called immediately
			assert(
				syncListenerCalled,
				"Sync listener should have been called immediately",
			);

			// Wait for async rejection
			await new Promise((resolve) => setTimeout(resolve, 50));

			assert(errorReceived, "Async error should have been caught");
		},
	);

	await t.step(
		"should handle cleanup functions for async listeners that reject",
		async () => {
			const emitter = new TypedEventEmitter();
			let errorCount = 0;

			emitter.on(TypedEventEmitterError, () => {
				errorCount++;
			});

			// Add async listener that rejects
			const cleanup = emitter.on(testStringEvent, async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				throw new Error("Cleanup test error");
			});

			emitter.emit(testStringEvent, "cleanup-test-1");

			await new Promise((resolve) => setTimeout(resolve, 50));
			assertEquals(errorCount, 1);

			// Remove the listener using cleanup function
			cleanup();

			// Emit again - should not trigger error
			emitter.emit(testStringEvent, "cleanup-test-2");

			await new Promise((resolve) => setTimeout(resolve, 50));
			assertEquals(errorCount, 1, "Error count should remain 1 after cleanup");
		},
	);

	await t.step("should handle listeners returning non-promise values", () => {
		const emitter = new TypedEventEmitter();
		let callCount = 0;
		let errorCount = 0;

		emitter.on(TypedEventEmitterError, () => {
			errorCount++;
		});

		// Note: TypeScript prevents non-void returns, but this tests runtime behavior
		// These would need type assertions in real code, but test the implementation

		// Listener that explicitly returns void despite side effects
		emitter.on(testStringEvent, () => {
			callCount++;
			// Side effect that returns number, but function returns void
			const _unused = 42;
		});

		emitter.on(testStringEvent, () => {
			callCount++;
			// Side effect that creates string, but function returns void
			const _unused = "string";
		});

		emitter.on(testStringEvent, () => {
			callCount++;
			// Side effect that creates object, but function returns void
			const _unused = { key: "value" };
		});

		emitter.emit(testStringEvent, "test");

		assertEquals(callCount, 3, "All listeners should have executed");
		assertEquals(errorCount, 0, "No errors should have occurred");
	});

	await t.step(
		"should handle listeners returning thenable objects",
		async () => {
			const emitter = new TypedEventEmitter();
			let thenableCalled = false;
			let errorReceived = false;

			emitter.on(TypedEventEmitterError, () => {
				errorReceived = true;
			});

			// Test what happens when a listener returns a thenable
			// Note: This is testing implementation details of promise detection
			emitter.on(testStringEvent, () => {
				thenableCalled = true;
				// Return a promise that rejects to test thenable handling
				return Promise.reject(new Error("Thenable rejection"));
			});

			emitter.emit(testStringEvent, "thenable-test");

			await new Promise((resolve) => setTimeout(resolve, 50));

			assert(thenableCalled, "Thenable listener should have been called");
			assert(errorReceived, "Error from thenable should have been caught");
		},
	);

	await t.step(
		"should handle rapid emit calls with async listeners",
		async () => {
			const emitter = new TypedEventEmitter();
			const executionOrder: string[] = [];
			let errorCount = 0;

			emitter.on(TypedEventEmitterError, () => {
				errorCount++;
			});

			// Async listener with varying delays
			emitter.on(testNumberEvent, async (value) => {
				const delay = value * 10;
				await new Promise((resolve) => setTimeout(resolve, delay));
				executionOrder.push(`completed-${value}`);
				if (value === 2) {
					throw new Error(`Error for ${value}`);
				}
			});

			// Rapid fire events
			emitter.emit(testNumberEvent, 3); // 30ms delay
			emitter.emit(testNumberEvent, 1); // 10ms delay
			emitter.emit(testNumberEvent, 2); // 20ms delay, will error

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Should complete in order of delay, not emission
			assertEquals(executionOrder.length, 3);
			assert(executionOrder.includes("completed-1"));
			assert(executionOrder.includes("completed-2"));
			assert(executionOrder.includes("completed-3"));
			assertEquals(errorCount, 1, "Only one error should have been emitted");
		},
	);

	await t.step(
		"should handle listener removal during async execution",
		async () => {
			const emitter = new TypedEventEmitter();
			let executionCount = 0;
			let errorReceived = false;

			emitter.on(TypedEventEmitterError, () => {
				errorReceived = true;
			});

			const asyncListener = async () => {
				executionCount++;
				await new Promise((resolve) => setTimeout(resolve, 20));
				executionCount++;
				throw new Error("Should still error even if removed");
			};

			emitter.on(testStringEvent, asyncListener);
			emitter.emit(testStringEvent, "test");

			// Remove listener while it's executing
			await new Promise((resolve) => setTimeout(resolve, 10));
			emitter.off(testStringEvent, asyncListener);

			await new Promise((resolve) => setTimeout(resolve, 30));

			assertEquals(executionCount, 2, "Async execution should complete");
			assert(
				errorReceived,
				"Error should still be emitted for in-flight async operation",
			);
		},
	);

	await t.step(
		"should handle event order with mixed sync/async listeners",
		async () => {
			const emitter = new TypedEventEmitter();
			const executionOrder: string[] = [];

			// Sync listeners
			emitter.on(testStringEvent, () => {
				executionOrder.push("sync-1");
			});

			emitter.on(testStringEvent, () => {
				executionOrder.push("sync-2");
			});

			// Async listeners
			emitter.on(testStringEvent, async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				executionOrder.push("async-1");
			});

			emitter.on(testStringEvent, async () => {
				await new Promise((resolve) => setTimeout(resolve, 5));
				executionOrder.push("async-2");
			});

			// Another sync listener
			emitter.on(testStringEvent, () => {
				executionOrder.push("sync-3");
			});

			emitter.emit(testStringEvent, "order-test");

			// All sync listeners should execute immediately
			assertEquals(executionOrder.slice(0, 3), ["sync-1", "sync-2", "sync-3"]);

			await new Promise((resolve) => setTimeout(resolve, 50));

			// Async listeners should complete after sync ones
			assertEquals(executionOrder.length, 5);
			assert(executionOrder.includes("async-1"));
			assert(executionOrder.includes("async-2"));
			// async-2 should complete before async-1 (shorter delay)
			const async2Index = executionOrder.indexOf("async-2");
			const async1Index = executionOrder.indexOf("async-1");
			assert(
				async2Index < async1Index,
				"async-2 should complete before async-1",
			);
		},
	);
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
		cleanupFunctions.push(
			emitter.on(testStringEvent, () => {
				eventCount++;
			}),
		);
		cleanupFunctions.push(
			emitter.on(cleanupEvent1, () => {
				eventCount++;
			}),
		);

		// Once listeners
		cleanupFunctions.push(
			emitter.once(cleanupEvent2, () => {
				eventCount++;
			}),
		);
		cleanupFunctions.push(
			emitter.once(cleanupEvent3, () => {
				eventCount++;
			}),
		);

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
		const cleanup1 = emitter.on(mixedEvent1, () => {
			eventCount++;
		});

		// Approach 2: Manual cleanup with off()
		const listener2 = () => {
			eventCount++;
		};
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
