use std::fmt::{Display, Formatter};

use yew::{function_component, html, Html};
use yew_router::{BrowserRouter, Routable, Switch};

use crate::menu::Sidebar;

mod menu;
mod pages;

#[derive(Debug, Copy, Clone, Eq, PartialEq, Routable)]
pub enum Location {
    #[at("/")]
    Home,
    #[at("/pgwm03")]
    Pgwm03,
    #[at("/test")]
    Test,
}

impl Display for Location {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Location::Home => f.write_str("Home"),
            Location::Pgwm03 => f.write_str("Pgwm 03"),
            Location::Test => f.write_str("Test"),
        }
    }
}

#[function_component]
fn App() -> Html {
    html! {
        html! {
            <BrowserRouter>
                <Switch<Location> render={render_content} />
            </BrowserRouter>
        }
    }
}

fn render_content(location: Location) -> Html {
    let content = match location {
        Location::Home => pages::home::page_html(),
        Location::Pgwm03 => pages::projects::pgwm03::page_html(),
        Location::Test => pages::projects::test::page_html(),
    };
    html! {
        <>
        <Sidebar />
        <div id="content">
            {content}
        </div>
        </>
    }
}

fn main() {
    yew::Renderer::<App>::new().render();
}
