export const Kitact = {
	createElement,
	render,
}

interface Props {
	[key: string]: any;
}

type Child = Element | Element[] | string | number;

interface Element {
	type: string;
	props: Props;
	children: Child | null;
	dom?: HTMLElement | Text | null;
	parent?: Element | null;
	alternate?: Element | null;
	effectTag?: 'PLACEMENT' | 'UPDATE' | 'DELETION';
	sibling?: Element | null;
	child?: Element | null;
}

function createElement(type: string, props?: Props | null, ...children: Child[]): Element {
	return {
		type,
		props: {
			...props,
			children: children.map(child =>
				typeof child === 'object' ? child : createTextElement(child),
			),
		},
		children: children || null,
	}
}

function createTextElement(text: string | number): Element {
	return {
		type: 'TEXT_ELEMENT',
		props: {
			nodeValue: text,
			children: [],
		},
		children: [],
	}
}

function createDom(fiber: Element): HTMLElement | Text {
	const dom =
		fiber.type === 'TEXT_ELEMENT'
		? document.createTextNode('')
		: document.createElement(fiber.type);
	updateDom(dom, {}, fiber.props);
	return dom;
}

const isEvent = (key: string): boolean => key.startsWith('on');
const isProperty = (key: string): boolean => key !== 'children' && !isEvent(key);
const isNew = (prev: Props, next: Props) => (key: string) => prev[key] !== next[key];
const isGone = (_prev: Props, next: Props) => (key: string) => !(key in next);

function updateDom(dom: HTMLElement | Text, prevProps: Props, nextProps: Props): void {
	// Remove old or changed event listeners
	Object.keys(prevProps)
	      .filter(isEvent)
	      .filter(key => !(key in nextProps) || isNew(prevProps, nextProps)(key))
	      .forEach(name => {
		      const eventType = name.toLowerCase().substring(2);
		      dom.removeEventListener(eventType, prevProps[name]);
	      });
	
	// Remove old properties
	Object.keys(prevProps)
	      .filter(isProperty)
	      .filter(isGone(prevProps, nextProps))
	      .forEach(name => {
			      dom[name] = '';
		      
	      });
	
	// Set new or changed properties
	Object.keys(nextProps)
	      .filter(isProperty)
	      .filter(isNew(prevProps, nextProps))
	      .forEach(name => {
		      dom[name] = nextProps[name];
	      });
	
	// Add event listeners
	Object.keys(nextProps)
	      .filter(isEvent)
	      .filter(isNew(prevProps, nextProps))
	      .forEach(name => {
		      const eventType = name.toLowerCase().substring(2);
		      dom.addEventListener(eventType, nextProps[name]);
	      });
}

function commitRoot(): void {
	deletions.forEach(commitWork);
	if(wipRoot) {
		commitWork(wipRoot.child);
	}
	currentRoot = wipRoot;
	wipRoot = null;
}

function commitWork(fiber:  Element | null | undefined): void {
	if (!fiber) {
		return;
	}
	
	const domParent = fiber.parent?.dom as HTMLElement;
	if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
		domParent.appendChild(fiber.dom);
	} else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
		updateDom(fiber.dom, fiber.alternate?.props || {}, fiber.props);
	} else if (fiber.effectTag === 'DELETION') {
		if(!fiber.dom) return
		domParent.removeChild(fiber?.dom);
	}
	
	commitWork(fiber.child);
	commitWork(fiber.sibling);
}

function render(element: Element | null | undefined, container: HTMLElement): void {
	wipRoot = {
		dom: container,
		props: {
			children: [element],
		},
		alternate: currentRoot,
	};
	deletions = [];
	nextUnitOfWork = wipRoot;
}

let nextUnitOfWork: Element | null = null;
let currentRoot: Element | null = null;
let wipRoot: Element | null = null;
let deletions: Element[] = [];

function workLoop(deadline: { timeRemaining: () => number }): void {
	let shouldYield = false;
	while (nextUnitOfWork && !shouldYield) {
		nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
		shouldYield = deadline.timeRemaining() < 1;
	}
	
	if (!nextUnitOfWork && wipRoot) {
		commitRoot();
	}
	
	requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);

function performUnitOfWork(fiber: Element): Element | null {
	if (!fiber.dom) {
		fiber.dom = createDom(fiber);
	}
	
	const elements = fiber.props.children;
	reconcileChildren(fiber, elements);
	
	if (fiber.child) {
		return fiber.child;
	}
	
	let nextFiber = fiber;
	while (nextFiber) {
		if (nextFiber.sibling) {
			return nextFiber.sibling;
		}
		nextFiber = nextFiber.parent;
	}
	
	return null;
}

function reconcileChildren(wipFiber: Element, elements: Child[]): void {
	let index = 0;
	let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
	let prevSibling: Element | null = null;
	
	while (index < elements.length || oldFiber != null) {
		const element = elements[index];
		let newFiber: Element | null = null;
		
		const sameType = oldFiber && element && element.type === oldFiber.type;
		
		if (sameType && oldFiber) {
			newFiber = {
				type: oldFiber.type,
				props: element.props,
				dom: oldFiber.dom,
				parent: wipFiber,
				alternate: oldFiber,
				effectTag: 'UPDATE',
				children: element.children || null,
			};
		}
		if (element && !sameType) {
			newFiber = {
				type: element.type,
				props: element.props,
				dom: null,
				parent: wipFiber,
				alternate: null,
				effectTag: 'PLACEMENT',
				children: element.children || null,
			};
		}
		if (oldFiber && !sameType) {
			oldFiber.effectTag = 'DELETION';
			deletions.push(oldFiber);
		}
		
		if (oldFiber) {
			oldFiber = oldFiber.sibling;
		}
		
		if (index === 0) {
			wipFiber.child = newFiber;
		} else if (element) {
			prevSibling.sibling = newFiber;
		}
		
		prevSibling = newFiber;
		index++;
	}
}
