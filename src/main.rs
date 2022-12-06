use std::fmt::Write;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::process::{Child, Stdio};

const HOME: LocationInfo = LocationInfo::new("/", "Home");
const HOME_LABEL: &str = "Home";
const NAV: LocationInfo = LocationInfo::new("/table-of-contents", "Nav");
const NAV_LABEL: &str = "Table of contents";
const NOT_FOUND: LocationInfo = LocationInfo::new("/not-found", "NotFound");
const LOCATIONS: [LocationInfo; 6] = [
    HOME,
    NAV,
    NOT_FOUND,
    LocationInfo::new("/meta", "Meta"),
    LocationInfo::new("/pgwm03", "Pgwm03"),
    LocationInfo::new("/test", "Test"),
];

fn main() {
    let workspace = std::env::current_dir().expect("Failed to get workspace from env");
    let ws_path = PathBuf::from(&workspace);
    let md_pages = ws_path.join("pages");

    let location_content = location_file_content();
    let mut total_content = location_content.into_bytes();
    let mut md_content = recurse_convert_pages(&md_pages, &PathBuf::new()).unwrap();
    // Sort to make generation deterministic
    md_content.sort_by(|a, b| a.path.cmp(&b.path));
    for content in md_content {
        total_content.extend(
            format_page(&content.name, content.child)
                .unwrap()
                .into_bytes(),
        );
    }
    total_content.extend(create_js().into_bytes());
    std::fs::write(ws_path.join("static").join("generated.js"), &total_content).unwrap();
    copy_minified(&ws_path).unwrap();
}

fn create_js() -> String {
    let mut raw = String::new();
    raw.push_str("function render(location) {\n");
    let _ = raw.write_fmt(format_args!(
        "\
        \tif (location === Location.{}.path) {{\n\
        {}\
        \t}} else if (location === Location.{}.path) {{\n\
        {}\
        \t}} \
        ",
        HOME.tag_name.to_uppercase(),
        create_inner_render(HOME.tag_name, Some((NAV_LABEL, NAV.path_name))),
        NAV.tag_name.to_uppercase(),
        create_inner_render(NAV.tag_name, Some((HOME_LABEL, HOME.path_name)))
    ));
    for location in LOCATIONS.into_iter().skip(3) {
        let _ = raw.write_fmt(format_args!(
            "\
            else if (location === Location.{}.path) {{\n\
            {}\
            \t}} \
        ",
            location.tag_name.to_uppercase(),
            create_inner_render(location.tag_name, None)
        ));
    }
    let _ = raw.write_fmt(format_args!(
        "\
        else {{\n\
        {}\
        \t}}\
    ",
        create_inner_render(NOT_FOUND.tag_name, None)
    ));
    raw.push_str(r#"
}
function create_nav_button(label, link) {
    return "<button class=\"menu-item\" onclick=NAVIGATION.navigate(\"" + link + "\")>" + label + "</button>";
}

class Navigation {
    constructor(location) {
        this.location = location;
    }

    navigate(location) {
        if (location !== this.location) {
            window.history.pushState({"pageTitle": location}, "", location);
            render(location);
        }
    }
    init_nav() {
        render(self.location);
    }
}
let cur = window.location.pathname.split("/").pop();
let NAVIGATION = new Navigation(cur);
    "#);
    raw
}

fn create_inner_render(tag_name: &str, has_special_nav: Option<(&str, &str)>) -> String {
    let mut base = "\t\tdocument.getElementById(\"menu\")\n".to_string();
    if let Some((nav_label, nav_link)) = has_special_nav {
        let _ = base.write_fmt(format_args!(
            "\t\t\t.innerHTML = create_nav_button(\"{}\", \"{}\");\n",
            nav_label, nav_link
        ));
    } else {
        let _ = base.write_fmt(format_args!("\t\t\t.innerHTML = create_nav_button(\"{}\", \"{}\") + create_nav_button(\"{}\", \"{}\");\n", HOME_LABEL, HOME.path_name, NAV_LABEL, NAV.path_name));
    }
    let _ = base.write_fmt(format_args!(
        "\t\tdocument.getElementById(\"content\")\n\
    \t\t\t.innerHTML = {}_HTML;\n",
        tag_name.to_uppercase()
    ));
    base
}

fn recurse_convert_pages(md_root: &Path, root_offset: &Path) -> Result<Vec<MdContent>, String> {
    let search = md_root.join(root_offset);
    let mut files_here = vec![];
    for entry in
        std::fs::read_dir(&search).map_err(|e| format!("Failed to read {md_root:?} {e}"))?
    {
        let entry = entry.map_err(|e| format!("Failed to read entry from {md_root:?} {e}"))?;
        let metadata = entry
            .metadata()
            .map_err(|e| format!("Failed to get metadata for entry {entry:?} {e}"))?;
        let path = entry.path();
        let file_name = path.file_name().unwrap();
        let new_offset = root_offset.join(file_name);
        if metadata.is_dir() {
            let sub_modules = recurse_convert_pages(md_root, &new_offset)?;
            files_here.extend(sub_modules.into_iter());
        } else if metadata.is_file() {
            let out_name = file_name.to_str().unwrap();
            let (name, _md) = out_name.split_once('.').unwrap();
            files_here.push(MdContent {
                path: path.clone(),
                name: name.to_string(),
                child: std::process::Command::new("npm")
                    .arg("run")
                    .arg("generate")
                    .arg(path)
                    .stdout(Stdio::piped())
                    .spawn()
                    .map_err(|e| format!("Failed to run npm script {e}"))?,
            });
        }
    }
    Ok(files_here)
}

#[derive(Debug)]
struct MdContent {
    path: PathBuf,
    name: String,
    child: Child,
}

#[derive(Copy, Clone, Debug)]
struct LocationInfo {
    path_name: &'static str,
    tag_name: &'static str,
}

impl LocationInfo {
    const fn new(path_name: &'static str, tag_name: &'static str) -> Self {
        Self {
            path_name,
            tag_name,
        }
    }
}

fn location_file_content() -> String {
    let mut content = "\
    const Location = Object.freeze({\n\
    "
    .to_string();
    for location in LOCATIONS {
        let _ = content.write_fmt(format_args!(
            "\t{}: {{\"path\": \"{}\", \"name\": \"{}\"}},\n",
            location.tag_name.to_uppercase(),
            location.path_name,
            location.tag_name
        ));
    }
    content.push_str("});\n");
    content
}

fn format_page(name: &str, child: Child) -> Result<String, String> {
    let output = child
        .wait_with_output()
        .map_err(|e| format!("Failed to wait for child process for {name} {e}"))?;
    let mut highlighted_html = String::from_utf8(output.stdout)
        .map_err(|e| format!("Failed to convert highlighted html to a utf8 string {e}"))?;
    let mut trimmed = String::new();
    let mut past_garbage_output = false;
    for line in highlighted_html.lines() {
        if line.is_empty() || line.starts_with('>') && !past_garbage_output {
            continue;
        } else {
            past_garbage_output = true;
            let _ = trimmed.write_fmt(format_args!("{line}\n"));
        }
    }
    highlighted_html = trimmed;
    for location in LOCATIONS {
        let replace_match = format!("href=\"{}\"", location.path_name);
        while let Some(_found) = highlighted_html.find(&replace_match) {
            highlighted_html =
                highlighted_html.replace(&replace_match, &to_nav_link_fn(location.path_name));
        }
    }
    let html_content = format!("<div class=\"markdown-body\">{}</div>", highlighted_html);
    let js_content = format!(
        "\n\
        const {}_HTML = String.raw`{}`;",
        name.to_uppercase(),
        html_content
    );
    Ok(js_content)
}

fn to_nav_link_fn(location: &str) -> String {
    format!("class=\"self-link\" onclick=NAVIGATION.navigate(\"{location}\")")
}

fn copy_minified(ws: &Path) -> Result<(), String> {
    let dist = ws.join("dist");
    match std::fs::remove_dir_all(&dist) {
        Ok(_) => {}
        Err(ref e) if e.kind() == ErrorKind::NotFound => {}
        Err(e) => return Err(format!("Failed to clean out dist directory {dist:?} {e}")),
    }
    std::fs::create_dir_all(&dist)
        .map_err(|e| format!("Failed to create dist dir {dist:?} {e}"))?;
    let dist_static = dist.join("static");
    std::fs::create_dir_all(&dist_static)
        .map_err(|e| format!("Failed to create dist static dir {dist_static:?} {e}"))?;
    let src = ws.join("index.html");
    let index = std::fs::read_to_string(&src)
        .map_err(|e| format!("Failed to read index.html at {src:?} {e}"))?;
    let dest = dist.join("index.html");
    std::fs::write(&dest, &index)
        .map_err(|e| format!("Failed to write minified {:?} to {:?} {e}", src, dest))?;
    let not_found = dist.join("404.html");
    std::fs::write(&not_found, &index)
        .map_err(|e| format!("Failed to write minified {:?} to {:?} {e}", src, not_found))?;
    let static_dir = ws.join("static");
    for entry in std::fs::read_dir(&static_dir)
        .map_err(|e| format!("Failed to read dir {:?} {e}", static_dir))?
    {
        let entry = entry.map_err(|e| format!("Failed to read entry at {:?} {e}", static_dir))?;
        let path = entry.path();
        let metadata = entry
            .metadata()
            .map_err(|e| format!("Failed to read metadata for {path:?} {e}"))?;
        if !metadata.is_file() {
            return Err(format!(
                "Only regular files allowed in static dir {:?} found something else at {path:?}",
                static_dir
            ));
        }
        let ext = path.extension().ok_or_else(|| {
            format!(
                "Found file without extension in static dir {:?} {path:?}",
                static_dir
            )
        })?;
        let ext_str = ext
            .to_str()
            .ok_or_else(|| format!("Found non utf8 file extension {ext:?}"))?;
        let content = std::fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read content for {path:?} {e}"))?;
        let minified = match ext_str {
            "css" => minifier::css::minify(&content)
                .map_err(|e| format!("Failed to minify {path:?} {e}"))?
                .to_string(),
            "js" => minifier::js::minify(&content).to_string(),
            _ => {
                return Err(format!(
                    "Only .js and .css files allowed in static dir {:?} found {path:?}",
                    static_dir
                ));
            }
        };
        let file_name = path.file_name().unwrap();
        let out = dist_static.join(file_name);
        std::fs::write(&out, minified)
            .map_err(|e| format!("Failed to write minified content to {out:?} {e}"))?
    }
    Ok(())
}
