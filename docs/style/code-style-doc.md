# **Loopware Online Subsystem Server: Style Guides**
## ***Code Style Guide***

---

### Description:
A simple and descriptive style guide showing the guidelines Loss uses for writing clean, maintainable code. In order for any contribution to be made to Loss they must follow these guidelines *(along with code quality and maintainability)*

---

### Templates:
#### Starter Template 1
This blank template is perfect for copy and pasting into your new file, allowing you to write code right away without having to worry about where things should go
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

---

#### Template 2
This "documented" template shows exactly how everything should look like at the end
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
	public static [modifier] myFunction(...params: type): Promise<returnType> {...}

	// Public Inherited Methods
	public [modifier] myCoolerFunction(...params: type): Promise<returnType> {...}

	// Private Static Methods
	private static [modifier] _mySecretFunction(...params: type): Promise<returnType> {...}

	// Private Inherited Methods
	private [modifier] _myCoolerSecretFunction(...params: type): Promise<returnType> {...}
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
async function myPublicFunction(...params: type): Promise<returnType> {...}

// Private Methods
async function _myPrivateFunction(...params: type): Promise<returnType> {...}

// Run
_init()
```

----