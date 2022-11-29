use yew::prelude::*;

use crate::markdown::render_markdown;
use crate::write_ups::{PGWM03_BYTES, TEST_BYTES};

const HOME_BYTES: &str = include_str!("Home.md");

pub enum Msg {
    Navigate(Location),
}

pub struct Home {
    current_page: Location,
}

#[derive(Debug, Copy, Clone, Eq, PartialEq)]
pub enum Location {
    Home,
    Pgwm03,
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
        html! {
            <div>
                <div class={{home}} onclick={ctx.link().callback(|_| Msg::Navigate(Location::Home))}>
                    <div class="nav-link-text">
                        {{"Home"}}
                    </div>
                </div>
                <div id="write-ups">
                    <div class={{pgwm}} onclick={ctx.link().callback(|_| Msg::Navigate(Location::Pgwm03))}>
                        <div class="nav-link-text">
                            {{"Pgwm 0.3"}}
                        </div>
                    </div>
                    <div class={{test}} onclick={ctx.link().callback(|_| Msg::Navigate(Location::Test))}>
                        <div class="nav-link-text">
                            {{"Test nav"}}
                        </div>
                    </div>
                </div>
            </div>
        }
    }
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
        let content = match self.current_page {
            Location::Home => render_markdown(HOME_BYTES),
            Location::Pgwm03 => render_markdown(PGWM03_BYTES),
            Location::Test => render_markdown(TEST_BYTES),
        };
        let side = self.render_sidebar(ctx);
        html! {
            <>
            <div id="header">
                {{"Marcus Grass' pages"}}
            </div>
            <div class="flex-parent" id="page-content">
                <div id="sidebar">
                    {side}
                </div>
                <div id="content">
                    <div id="markdown-text">
                        {content}
                    </div>
                </div>
            </div>
            </>
        }
    }
}
