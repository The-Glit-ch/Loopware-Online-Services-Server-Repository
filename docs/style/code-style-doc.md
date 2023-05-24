# **Loopware Online Subsystem Server: Style Guides**
## ***Code Style Guide***

---

### Description:
A simple and descriptive guide showing the style guidelines that Loss uses. In order to contribute to Loss these style guidelines must be met *(along with code quality and maintainability)*

---

### Starter Template:

```typescript
// Imports

// Docstring

// Enums

// Interfaces

// Classes
	// Public Variables

	// Private Variables

	// Constructor

	// Public Static Methods

	// Public Inherited Methods

	// Private Static Methods

	// Private Inherited Methods

// Constants

// Public Variables

// Private Variables

// _init()

// Public Methods

// Private Methods

// Run
```

### Documented Template:
```typescript
// Imports
import variable from 'system_library';
import { type } from 'system_library';
import variable, { type } from 'system_library';

import variable from './path/to/module';
import { type } from './path/to/module';
import variable, { type } from './path/to/module';

import variable from 'external/other_library';
import { type } from 'external/other_library';
import variable, { type } from 'external/other_library';

// Docstring
/**
* [Title] @ [Name]
* [Description]
*
* Loopware Online Subsystem @ Example
* My example docstring
*/

// Classes
class MyClass extends MyCoolerClass {
	// Public Variables
	public myVariable: type = value

	// Private Variables
	private _myPrivateVariable: type = value

	// Constructor
	constructor(...params: type) {...}

	// Public Static Methods
	public static [modifier] myFunction(...params: type): returnType {...}

	// Public Inherited Methods
	public [modifier] myCoolerFunction(...params: type): returnType {...}

	// Private Static Methods
	private static [modifier] mySecretFunction(...params: type): returnType {...}

	// Private Inherited Methods
	private [modifier] myCoolerSecretFunction(...params: type): returnType {...}
}

// Enums
enum MyEnum {
	value1,
	value2,
	value3,
}

// Interfaces
interface MyInterface {
	value1: type,
	value2: myCustomType,
}

// Constants
const MY_CONSTANT: type = value

// Public Variables
let myVariable: type = value

// Private Variables
let _mySecretVariable: type = value

// _init()
async _init(): Promise<void> {...}

// Public Methods
async function myPublicFunction(...params: type) {...}

// Private Methods
async function myPrivateFunction(...params: type) {...}

// Run
_init()
```

---