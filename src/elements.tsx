import {Kitact} from "./main"
import "./style.css"
/** @jsx Kitact.createElement */

const container = document.getElementById("root")

const updateValue = e => {
	rerender(e.target.value)
}

const rerender = value => {
	const element = (
		<div>
			<input onInput={updateValue} value={value} />
			<h2>Hello {value}</h2>
		</div>
	)
	Kitact.render(element, container)
}

rerender("World")