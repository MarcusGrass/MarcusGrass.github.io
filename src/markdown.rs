use pulldown_cmark::Parser;
use yew::Html;

pub(crate) fn render_markdown(raw: &str) -> Html {
    let parser = Parser::new(raw);
    let cap = raw.len() * 3 / 2;
    let mut html_output: String = String::with_capacity(cap);
    pulldown_cmark::html::push_html(&mut html_output, parser);
    let div = gloo_utils::document().create_element("div").unwrap();
    div.set_inner_html(&html_output);
    Html::VRef(div.into())
}
