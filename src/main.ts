export const Kitact = {
	createElement,
	render,
}

interface Props { [key: string]: any };

type Child = Element | Element[] | string | number;

interface Element {
	type: string;
	props: Props;
}

function createElement(type: string, props?: Props | null, ...children: Child[]): Element {
	return {
		type,
		props: {
			...props,
			children: children.map((child): any   => typeof child === "object" ? child : createTextElement(child)),
		}
	}
}

function createTextElement(text: string | number) {
	return {
		type: "TEXT_ELEMENT",
		props: {
			nodeValue: text,
			children: [],
		},
	}
}

function render(element: Element, container: HTMLElement) {
	const dom = element.type === "TEXT_ELEMENT"
	            ? document.createTextNode('')
	            : document.createElement(element.type);
	
	const isProperty = (key: string) => key !== "children"
	Object.keys(element.props).filter(isProperty).forEach((name) => {
		dom[name] = element.props[name];
	})
	
	element.props?.children.forEach((child) => {
		render(child as Element, dom);
	})
	
	
	container.appendChild(dom);
}