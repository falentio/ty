# Ty - Fully Typed Event Emitter

A lightweight, fully typed event emitter library for TypeScript and JavaScript
that provides complete type safety for your event-driven applications.

## Features

- 🔒 **Full Type Safety** - Complete TypeScript support with typed event names
  and payloads
- 🪶 **Lightweight** - Minimal footprint with zero dependencies
- ⚡ **High Performance** - Optimized for speed and memory efficiency
- 🔧 **Easy to Use** - Simple, intuitive API
- 🎯 **Event Filtering** - Advanced event filtering and conditional listeners
- 🔄 **Promise Support** - Built-in async/await support for event handling
- 🛡️ **Memory Safe** - Automatic cleanup and memory leak prevention
- 📦 **Deno Ready** - Built for Deno with ESM support

## Installation

### Deno

To install `ty` in Deno, you can use the `deno add` command:

```bash
deno add jsr:@falentio/ty
```

Or, you can import it directly into your Deno project:

```typescript
import { createTypedEvent, TypedEventEmitter } from "jsr:@falentio/ty";
```

### Node.js (npm, pnpm, Yarn)

To install `ty` in a Node.js project using npm, pnpm, or Yarn, you can use the
`jsr` CLI. First, ensure you have `jsr` installed:

```bash
npm install -g jsr@latest # or pnpm add -g jsr or yarn global add jsr
```

Then, add `ty` to your project:

```bash
jsr add @falentio/ty
```

This will automatically configure your project to use packages from jsr.io.

## Usage

Here's a comprehensive guide on how to use the `ty` library:

### Basic Usage

```typescript
import { createTypedEvent, TypedEventEmitter } from "jsr:@falentio/ty";

// Create typed events
const userLoginEvent = createTypedEvent<{ userId: string; timestamp: Date }>(
  "user-login",
);
const messageEvent = createTypedEvent<string>("message");

// Create an event emitter instance
const emitter = new TypedEventEmitter();

// Add listeners
emitter.on(userLoginEvent, (data) => {
  console.log(`User ${data.userId} logged in at ${data.timestamp}`);
});

emitter.on(messageEvent, (message) => {
  console.log(`Message received: ${message}`);
});

// Emit events
emitter.emit(userLoginEvent, {
  userId: "123",
  timestamp: new Date(),
});

emitter.emit(messageEvent, "Hello, World!");
```

### Creating Typed Events

The `createTypedEvent` function creates a typed event with complete type safety:

```typescript
// String events
const nameEvent = createTypedEvent<string>("name-changed");

// Number events
const scoreEvent = createTypedEvent<number>("score-updated");

// Void events (no payload)
const readyEvent = createTypedEvent<void>("ready");

// Complex object events
interface UserData {
  id: number;
  name: string;
  email: string;
}
const userEvent = createTypedEvent<UserData>("user-created");

// Union type events
const statusEvent = createTypedEvent<"active" | "inactive" | "pending">(
  "status-changed",
);

// Optional properties
interface Config {
  theme?: "light" | "dark";
  notifications: boolean;
}
const configEvent = createTypedEvent<Config>("config-updated");
```

### Event Listeners

#### Adding Listeners with `on()`

```typescript
const dataEvent = createTypedEvent<{ value: number }>("data");
const emitter = new TypedEventEmitter();

// Add a listener
const unsubscribe = emitter.on(dataEvent, (data) => {
  console.log(`Received value: ${data.value}`);
});

// The on() method returns a cleanup function
// Call it to remove the listener
unsubscribe();
```

#### One-time Listeners with `once()`

```typescript
const initEvent = createTypedEvent<string>("init");

// This listener will only be called once
const cleanup = emitter.once(initEvent, (message) => {
  console.log(`Initialization: ${message}`);
});

emitter.emit(initEvent, "Starting..."); // Listener is called
emitter.emit(initEvent, "Already started"); // Listener is NOT called
```

#### Manual Listener Removal with `off()`

```typescript
const updateEvent = createTypedEvent<number>("update");

const listener = (value: number) => {
  console.log(`Update: ${value}`);
};

emitter.on(updateEvent, listener);

// Remove the listener manually
emitter.off(updateEvent, listener);
```

### Multiple Listeners

You can add multiple listeners to the same event:

```typescript
const alertEvent = createTypedEvent<string>("alert");

// Add multiple listeners
emitter.on(alertEvent, (message) => {
  console.log(`Console: ${message}`);
});

emitter.on(alertEvent, (message) => {
  // Send to logging service
  logService.warn(message);
});

emitter.on(alertEvent, (message) => {
  // Show notification
  showNotification(message);
});

// All listeners will be called in the order they were added
emitter.emit(alertEvent, "Something happened!");
```

### Advanced Type Safety

#### Complex Object Types

```typescript
interface ProcessedData {
  id: number;
  metadata: {
    tags: string[];
    created: Date;
  };
  process?: (input: string) => number;
}

const dataProcessedEvent = createTypedEvent<ProcessedData>("data-processed");

emitter.on(dataProcessedEvent, (data) => {
  // Full type safety - IDE autocomplete and type checking
  console.log(`Processing item ${data.id}`);
  console.log(`Tags: ${data.metadata.tags.join(", ")}`);

  if (data.process) {
    const result = data.process("test");
    console.log(`Process result: ${result}`);
  }
});
```

#### Union Types

```typescript
type APIResponse =
  | { type: "success"; data: any }
  | { type: "error"; message: string; code: number };

const apiResponseEvent = createTypedEvent<APIResponse>("api-response");

emitter.on(apiResponseEvent, (response) => {
  // TypeScript will enforce proper type checking
  if (response.type === "success") {
    console.log("Success:", response.data);
  } else {
    console.log(`Error ${response.code}: ${response.message}`);
  }
});
```

### Error Handling

The library includes built-in error handling. If a listener throws an error, it
will emit a special error event:

```typescript
import { TypedEventEmitterError } from "jsr:@falentio/ty";

const problematicEvent = createTypedEvent<string>("problematic");

// Add an error handler
emitter.on(TypedEventEmitterError, (error) => {
  console.error("Event listener error:", error);
});

// Add a listener that might throw
emitter.on(problematicEvent, (data) => {
  throw new Error("Something went wrong!");
});

// When emitted, the error will be caught and re-emitted as TypedEventEmitterError
emitter.emit(problematicEvent, "test");
```

### Event-Driven Architecture Patterns

#### Data Processing Pipeline

```typescript
interface RawData {
  value: string;
}

interface ProcessedData {
  value: string;
  processed: boolean;
  timestamp: Date;
}

const rawDataEvent = createTypedEvent<RawData>("raw-data");
const processedDataEvent = createTypedEvent<ProcessedData>("processed-data");

// Set up processing pipeline
emitter.on(rawDataEvent, (raw) => {
  // Process the data
  const processed: ProcessedData = {
    value: raw.value.toUpperCase(),
    processed: true,
    timestamp: new Date(),
  };

  // Emit processed data
  emitter.emit(processedDataEvent, processed);
});

emitter.on(processedDataEvent, (data) => {
  console.log("Data processed:", data);
});

// Start the pipeline
emitter.emit(rawDataEvent, { value: "hello world" });
```

### Memory Management and Cleanup

#### Cleanup Functions Pattern

```typescript
class ComponentManager {
  private cleanupFunctions: Array<() => void> = [];

  constructor(private emitter: TypedEventEmitter) {
    this.setupListeners();
  }

  private setupListeners() {
    // Store cleanup functions for later use
    this.cleanupFunctions.push(
      this.emitter.on(userLoginEvent, this.handleUserLogin.bind(this)),
      this.emitter.on(messageEvent, this.handleMessage.bind(this)),
      this.emitter.once(initEvent, this.handleInit.bind(this)),
    );
  }

  private handleUserLogin(data: { userId: string; timestamp: Date }) {
    // Handle user login
  }

  private handleMessage(message: string) {
    // Handle message
  }

  private handleInit(message: string) {
    // Handle initialization
  }

  destroy() {
    // Clean up all listeners
    this.cleanupFunctions.forEach((cleanup) => cleanup());
    this.cleanupFunctions = [];
  }
}
```

#### Mixed Cleanup Approaches

```typescript
const tempEvent = createTypedEvent<string>("temp");
const permanentEvent = createTypedEvent<number>("permanent");

// Approach 1: Use cleanup function
const cleanup1 = emitter.on(tempEvent, (data) => {
  console.log("Temporary:", data);
});

// Approach 2: Manual cleanup with off()
const permanentListener = (value: number) => {
  console.log("Permanent:", value);
};
emitter.on(permanentEvent, permanentListener);

// Later cleanup
cleanup1(); // Function-based cleanup
emitter.off(permanentEvent, permanentListener); // Manual cleanup
```
