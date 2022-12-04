use yew::{html, Callback, Component, Context, Html};
use yew_router::scope_ext::RouterScopeExt;

use crate::Location;

#[derive(Debug)]
pub struct Sidebar {
    state: MenuState,
}

#[derive(Debug)]
struct MenuState {
    selected: MenuOption,
}

#[derive(Debug, Eq, PartialEq)]
pub enum MenuOption {
    Link(Location),
    Nested(SubMenu),
    None,
}

#[derive(Debug, Eq, PartialEq)]
pub enum SubMenu {
    Base,
    Projects,
}

const BASE: MenuOption = MenuOption::Nested(SubMenu::Base);

impl SubMenu {
    const fn options(&self) -> &'static [MenuOption] {
        match self {
            SubMenu::Base => &[
                MenuOption::Link(Location::Home),
                MenuOption::Nested(SubMenu::Projects),
            ],
            SubMenu::Projects => &[
                MenuOption::Link(Location::Pgwm03),
                MenuOption::Link(Location::Test),
            ],
        }
    }
}

#[derive(Debug, Eq, PartialEq)]
pub enum SidebarMsg {
    Clicked(MenuOption),
}

impl Component for Sidebar {
    type Message = SidebarMsg;
    type Properties = ();

    fn create(_ctx: &Context<Self>) -> Self {
        Self {
            state: MenuState {
                selected: MenuOption::None,
            },
        }
    }

    fn update(&mut self, ctx: &Context<Self>, msg: Self::Message) -> bool {
        match msg {
            SidebarMsg::Clicked(msg) => {
                match msg {
                    MenuOption::Link(location) => {
                        self.state.selected = MenuOption::None;
                        ctx.link().navigator().unwrap().replace(&location);
                    }
                    MenuOption::Nested(submenu) => {
                        self.state.selected = MenuOption::Nested(submenu);
                    }
                    MenuOption::None => {
                        if self.state.selected == MenuOption::None {
                            self.state.selected = BASE;
                        } else {
                            self.state.selected = MenuOption::None;
                        }
                    }
                }
                true
            }
        }
    }

    fn view(&self, ctx: &Context<Self>) -> Html {
        match &self.state.selected {
            MenuOption::Link(_) => {
                panic!("Nonsensical state");
            }
            MenuOption::Nested(sub_menu) => match sub_menu {
                SubMenu::Base => {
                    let none_menu = generate_item(ctx, &MenuOption::None);
                    let base_menu = generate_from_options(ctx, sub_menu.options());
                    html! {
                        <div class="menu-group">
                        {none_menu}
                        {base_menu}
                        </div>
                    }
                }
                SubMenu::Projects => {
                    let base_opts = SubMenu::Base.options();
                    let none_menu = generate_item(ctx, &MenuOption::None);
                    let base_opts_html = generate_from_options(ctx, base_opts);
                    let project_opts_html = generate_from_options(ctx, SubMenu::Projects.options());
                    html! {
                        <div class="menu-group">
                            {none_menu}
                            {base_opts_html}
                            {project_opts_html}
                        </div>
                    }
                }
            },
            MenuOption::None => generate_item(ctx, &self.state.selected),
        }
    }
}

fn generate_from_options(ctx: &Context<Sidebar>, options: &'static [MenuOption]) -> Html {
    let mut options_html = vec![];
    for opt in options {
        options_html.push(generate_item(ctx, opt));
    }
    let inner = options_html.into_iter().collect::<Html>();
    html! {
        <div class="menu-vertical">
            { inner }
        </div>
    }
}

fn generate_item(ctx: &Context<Sidebar>, opt: &MenuOption) -> Html {
    match opt {
        MenuOption::Link(location) => {
            let scope = ctx.link().clone();
            let nav = scope.navigator().unwrap();
            let loc = *location;
            let on_click = Callback::from(move |_| {
                scope.send_message(SidebarMsg::Clicked(MenuOption::Link(loc)));
                nav.replace(&loc);
            });
            html! {
                <button class="menu-item" onclick={on_click}>{location}</button>
            }
        }
        MenuOption::Nested(sub) => match sub {
            SubMenu::Base => {
                let scope = ctx.link().clone();
                let on_click = Callback::from(move |_| {
                    scope.send_message(SidebarMsg::Clicked(MenuOption::Nested(SubMenu::Base)))
                });
                html! {
                    <button class="menu-item" onclick={on_click}>{{"Base"}}</button>
                }
            }
            SubMenu::Projects => {
                let scope = ctx.link().clone();
                let on_click = Callback::from(move |_| {
                    scope.send_message(SidebarMsg::Clicked(MenuOption::Nested(SubMenu::Projects)))
                });
                html! {
                    <button class="menu-item" onclick={on_click}>{{"Projects"}}</button>
                }
            }
        },
        MenuOption::None => {
            let scope = ctx.link().clone();
            let on_click =
                Callback::from(move |_| scope.send_message(SidebarMsg::Clicked(MenuOption::None)));
            html! {
                <button class="menu-item" onclick={on_click}>{{"Menu"}}</button>
            }
        }
    }
}
