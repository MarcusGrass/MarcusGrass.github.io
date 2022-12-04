const RAW_HTML: &str = include_str!("Pgwm03.html");

pub fn page_html() -> yew::Html {
	let div = gloo_utils::document().create_element("div").unwrap();
	div.set_inner_html(RAW_HTML);
	div.set_class_name("markdown-body");
	yew::Html::VRef(div.into())
}

