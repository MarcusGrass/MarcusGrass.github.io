use std::fmt::Write;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::process::{Child, Stdio};

const HOME: LocationInfo = LocationInfo::new("/", "Home", "index");
const HOME_LABEL: &str = "Home";
const NAV: LocationInfo = LocationInfo::new("/table-of-contents.html", "Nav", "table-of-contents");
const NAV_LABEL: &str = "Table of contents";
const LOCATIONS: &[LocationInfo] = &[
    HOME,
    NAV,
    LocationInfo::new("/meta.html", "Meta", "meta"),
    LocationInfo::new("/pgwm03.html", "Pgwm03", "pgwm03"),
    LocationInfo::new("/boot.html", "Boot", "boot"),
    LocationInfo::new("/pgwm04.html", "Pgwm04", "pgwm04"),
    LocationInfo::new("/threads.html", "Threads", "threads"),
    LocationInfo::new("/static-pie.html", "StaticPie", "static-pie"),
    LocationInfo::new("/kbd-smp.html", "KbdSmp", "kbd-smp"),
    LocationInfo::new("/test.html", "Test", "test"),
];

fn main() {
    let workspace = std::env::current_dir().expect("Failed to get workspace from env");
    let ws_path = PathBuf::from(&workspace);
    let md_pages = ws_path.join("pages");

    let mut md_content = recurse_convert_pages(&md_pages, &PathBuf::new()).unwrap();
    // Sort to make generation deterministic
    md_content.sort_by(|a, b| a.md_file_path.cmp(&b.md_file_path));
    let mut html_pages = Vec::new();
    html_pages.push(("404.html".to_string(), create_404()));
    for content in md_content {
        let path = format!("{}.html", content.location_info.link_name);
        let page = format_html(content).unwrap();
        html_pages.push((path, page));
    }
    copy_minified(&ws_path, html_pages).unwrap();
}

fn format_html(md_content: MdContent) -> Result<String, String> {
    let name = &md_content.name;
    let output = md_content
        .child
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
    let links = if md_content.location_info == HOME {
        format!(
            "<a href={} class=\"menu-item\">{}</a>",
            NAV.path_name, NAV_LABEL
        )
    } else if md_content.location_info == NAV {
        format!(
            "<a href={} class=\"menu-item\">{}</a>",
            HOME.path_name, HOME_LABEL
        )
    } else {
        format!(
            "<a href={} class=\"menu-item\">{}</a><a href={} class=\"menu-item\">{}</a>",
            HOME.path_name, HOME_LABEL, NAV.path_name, NAV_LABEL
        )
    };
    let html_content = format!(
        r#"
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/html">
<head>
    <meta charset="UTF-8">
    <base href="/">
    <link rel="stylesheet" href="static/styles.css">
    <link rel="stylesheet" href="static/github-markdown.css">
    <link rel="stylesheet" href="static/starry_night.css">
    <title>{name}</title>
</head>
<body>
<div id="menu">
{links}
</div>
<div id="content">
<div class="markdown-body">{highlighted_html}</div>
</div>
</body>
</html>
    "#
    );
    std::fs::write(
        format!("target/{}.html", md_content.location_info.link_name),
        &html_content,
    )
    .unwrap();
    Ok(html_content)
}

// Should really be done by the webserver, but this is github pages so.
fn create_404() -> String {
    let mut script_inner = String::new();
    for loc in LOCATIONS {
        script_inner.write_fmt(format_args!(r#"if (window.location.pathname === "{}" || window.location.pathname === "{}/") {{ let next_url = window.location.protocol + "//" + window.location.host + "{}"; window.location.replace(next_url);}}"#, loc.link_name, loc.link_name, loc.path_name)).unwrap();
        script_inner.push('\n');
    }
    format!(
        r#"<!DOCTYPE html>
        <html lang="en" xmlns="http://www.w3.org/1999/html">
            <head>
            <meta charset="UTF-8">
            <base href="/">
            <title>Not found</title>
            <script>{script_inner}</script>
            </head>
        <body>
        NOT FOUND
        </body>
        </html>
        "#
    )
}

fn recurse_convert_pages(md_root: &Path, root_offset: &Path) -> Result<Vec<MdContent>, String> {
    let search = md_root.join(root_offset);
    let mut files_here = vec![];
    for entry in
        std::fs::read_dir(search).map_err(|e| format!("Failed to read {md_root:?} {e}"))?
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
            let location_info = LOCATIONS
                .iter()
                .find(|l| l.md_name == name)
                .copied()
                .expect(&format!("Found md file with an unmapped name {name}"));
            files_here.push(MdContent {
                location_info,
                md_file_path: path.clone(),
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
    location_info: LocationInfo,
    md_file_path: PathBuf,
    name: String,
    child: Child,
}

#[derive(Copy, Clone, Debug, Eq, PartialEq)]
struct LocationInfo {
    path_name: &'static str,
    md_name: &'static str,
    link_name: &'static str,
}

impl LocationInfo {
    const fn new(path_name: &'static str, tag_name: &'static str, link_name: &'static str) -> Self {
        Self {
            path_name,
            md_name: tag_name,
            link_name,
        }
    }
}

fn copy_minified(ws: &Path, html_path_content: Vec<(String, String)>) -> Result<(), String> {
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
        let content =
            std::fs::read(&path).map_err(|e| format!("Failed to read content for {path:?} {e}"))?;
        let file_name = path.file_name().unwrap();
        let (out, minified) = match ext_str {
            "css" => (
                &dist_static,
                minifier::css::minify(&String::from_utf8(content).unwrap())
                    .map_err(|e| format!("Failed to minify {path:?} {e}"))?
                    .to_string(),
            ),
            "js" => (
                &dist_static,
                minifier::js::minify(&String::from_utf8(content).unwrap()).to_string(),
            ),
            "jpg" => {
                std::fs::write(dist_static.join(path.file_name().unwrap()), &content)
                    .expect("Failed to copy static image");
                continue;
            }
            _ => {
                return Err(format!(
                    "Only .js, .css, and jpg files allowed in static dir {:?} found {path:?}",
                    static_dir
                ));
            }
        };
        let out = out.join(file_name);
        std::fs::write(&out, minified)
            .map_err(|e| format!("Failed to write minified content to {out:?} {e}"))?
    }
    for (path, content) in html_path_content {
        let minified = minifier::html::minify(&content);
        std::fs::write(&dist.join(&path), minified)
            .map_err(|e| format!("Failed to write minified html content to {path:?} {e}"))?
    }
    Ok(())
}
