use yew::prelude::*;
use yew_router::scope_ext::RouterScopeExt;
use yew_router::{BrowserRouter, Routable, Switch};

use crate::markdown::render_markdown;
use crate::write_ups::{HOME, PGWM03, TEST};

pub enum Msg {
    Navigate(Location),
}

pub struct Home {
    current_page: Location,
}

#[derive(Debug, Copy, Clone, Eq, PartialEq, Routable)]
pub enum Location {
    #[at("/")]
    Home,
    #[at("/pgwm03")]
    Pgwm03,
    #[at("/test")]
    Test,
}

impl Home {
    fn render_sidebar(&self, ctx: &Context<Self>) -> Html {
        let regular_nav = "nav-link-box nav-unselected";
        let selected_nav = "nav-link-box nav-selected";
        let (home, pgwm, test) = match self.current_page {
            Location::Home => (selected_nav, regular_nav, regular_nav),
            Location::Pgwm03 => (regular_nav, selected_nav, regular_nav),
            Location::Test => (regular_nav, regular_nav, selected_nav),
        };
        let nav = ctx.link().navigator().unwrap();
        let nav_c = nav.clone();
        let home_nav = Callback::from(move |_| nav_c.push(&Location::Home));
        let nav_c = nav.clone();
        let pgwm03_nav = Callback::from(move |_| nav_c.push(&Location::Pgwm03));
        let nav_c = nav.clone();
        let test_nav = Callback::from(move |_| nav_c.push(&Location::Test));

        html! {
            <div class="flex-parent">
                <button class={{home}} onclick={home_nav}>
                        {{"Home"}}
                </button>
                <button class={{pgwm}} onclick={pgwm03_nav}>
                        {{"Pgwm 0.3"}}
                </button>
                <button class={{test}} onclick={test_nav}>
                    {{"Test nav"}}
                </button>
            </div>
        }
    }
}
fn render_content(location: Location) -> Html {
    let content = match location {
        Location::Home => render_markdown(HOME),
        Location::Pgwm03 => render_markdown(PGWM03),
        Location::Test => render_markdown(TEST),
    };
    content
}
impl Component for Home {
    type Message = Msg;
    type Properties = ();

    fn create(_ctx: &Context<Self>) -> Self {
        Self {
            current_page: Location::Home,
        }
    }

    fn update(&mut self, _ctx: &Context<Self>, msg: Self::Message) -> bool {
        match msg {
            Msg::Navigate(loc) => {
                if self.current_page != loc {
                    self.current_page = loc;
                    // the value has changed so we need to
                    // re-render for it to appear on the page
                    true
                } else {
                    false
                }
            }
        }
    }

    fn view(&self, ctx: &Context<Self>) -> Html {
        let side = self.render_sidebar(ctx);
        html! {
            <>
            <div id="nav">
                {side}
            </div>
            <div id="content">
                <div id="markdown-text">
                    <BrowserRouter>
                        <Switch<Location> render={render_content} />
                    </BrowserRouter>
                </div>
            </div>
            </>
        }
    }
}
