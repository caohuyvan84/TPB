# @shared/dto

Shared Data Transfer Object (DTO) schemas using Zod for the TPB CRM Platform.

## Features

- Runtime validation using Zod 4.3.6
- Type-safe DTOs with TypeScript inference
- Reusable validation schemas across frontend and backend
- Automatic type generation from schemas

## Usage

### Import Schemas

```typescript
import { 
  CreateInteractionDtoSchema,
  UpdateTicketDtoSchema,
  LoginDtoSchema 
} from '@shared/dto';

// Validate data
const result = CreateInteractionDtoSchema.safeParse(data);
if (result.success) {
  // data is valid
  const validData = result.data;
} else {
  // handle validation errors
  console.error(result.error);
}
```

### Import Types

```typescript
import type { 
  CreateInteractionDto,
  UpdateTicketDto,
  LoginDto 
} from '@shared/dto';

function createInteraction(dto: CreateInteractionDto) {
  // dto is type-safe
}
```

## Available Schemas

### Agent Status
- `SetChannelStatusDtoSchema`
- `ChannelStatusSchema`

### Interactions
- `CreateInteractionDtoSchema`
- `UpdateInteractionDtoSchema`

### Customers
- `CreateCustomerDtoSchema`
- `UpdateCustomerDtoSchema`

### Tickets
- `CreateTicketDtoSchema`
- `UpdateTicketDtoSchema`

### Notifications
- `CreateNotificationDtoSchema`

### Authentication
- `LoginDtoSchema`
- `RegisterDtoSchema`

### Common
- `PaginationParamsSchema`
- `SortParamsSchema`

## Validation Example

```typescript
import { CreateTicketDtoSchema } from '@shared/dto';

const ticketData = {
  subject: 'Payment Issue',
  description: 'Customer unable to process payment',
  priority: 'high',
  customerId: '123e4567-e89b-12d3-a456-426614174000'
};

const result = CreateTicketDtoSchema.safeParse(ticketData);
if (result.success) {
  // Create ticket with validated data
  await createTicket(result.data);
}
```

## Development

This package uses Zod for runtime validation and type inference.
All schemas automatically generate corresponding TypeScript types.
