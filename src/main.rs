use crate::home::Home;

mod home;
mod markdown;
mod write_ups;

fn main() {
    yew::Renderer::<Home>::new().render();
}
