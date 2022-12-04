const RAW_HTML: &str = "<h1>My Github pages</h1>
<p>This is a place to store my stray thoughts in the form of write-ups, so that I might remember the strange things
I've encountered along the way.<br />
I'll try to write them to be interesting enough.</p>
<h2>This page</h2>
<p>There's not supposed to be a web 1.0 vibe to it, but I'm horrible at front-end styling so here we are.<br />
The site is coonstructed in <a href=\"https://github.com/rust-lang/rust\">Rust</a> with <a href=\"https://yew.rs/\">Yew</a>,
as with all things in my free time I make things more complicated than they need to be.<br />
Except for the actual content, I pulled in a Markdown renderer so that I don't have to do so much web-work.<br />
I did also add some highlighting using <a href=\"https://github.com/highlightjs/highlight.js\">highlightjs</a>.</p>
<p>All page content except for some glue is just rendered markdown contained
in <a href=\"https://github.com/MarcusGrass/marcusgrass.github.io\">the repo</a>.</p>
<h2>Content</h2>
<p>See the navbar for links to the rest of the documents on these pages</p>
";

pub fn page_html() -> yew::Html {
	let div = gloo_utils::document().create_element("div").unwrap();
	div.set_inner_html(RAW_HTML);
	div.set_class_name("markdown-body");
	yew::Html::VRef(div.into())
}

