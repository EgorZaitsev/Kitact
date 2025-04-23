import {Kitact} from "./main"
import "./style.css"
/** @jsx Kitact.createElement */

const Title = <h1>Hello Kitact</h1>

const App= <div >
	<div className="title">{Title}</div>
</div>


const root = document.getElementById("root")

Kitact.render(App, root)

console.log(App)