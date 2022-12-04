use std::fmt::Write;
use std::path::{Path, PathBuf};

use pulldown_cmark::Parser;

fn main() {
    let workspace = std::env::var("CARGO_MANIFEST_DIR").expect("Failed to get workspace from env");
    let ws_path = PathBuf::from(&workspace);
    let md_pages = ws_path.join("pages");
    let html_pages = ws_path.join("src").join("pages");
    let modules = recurse_convert_pages(&md_pages, &html_pages, &PathBuf::new()).unwrap();
    dump_mod("pages", &ws_path.join("src"), modules).unwrap();
}

fn recurse_convert_pages(
    md_root: &Path,
    html_root: &Path,
    root_offset: &Path,
) -> Result<Vec<String>, String> {
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
            let sub_modules = recurse_convert_pages(md_root, html_root, &new_offset)?;
            let mod_name = file_name.to_str().unwrap();
            dump_mod(mod_name, &html_root.join(root_offset), sub_modules)?;
            files_here.push(mod_name.to_string());
        } else if metadata.is_file() {
            let raw = std::fs::read_to_string(&path)
                .map_err(|e| format!("Failed to read markdown from {path:?} {e}"))?;
            let out_name = file_name.to_str().unwrap();
            let (name, _md) = out_name.split_once('.').unwrap();
            let (rust_content, html_content) = format_page_mod(&raw, name);
            let out_name = file_name.to_str().unwrap();
            let (name, _md) = out_name.split_once('.').unwrap();
            let lc_name = name.to_lowercase();
            let rust_out_file = html_root.join(root_offset).join(format!("{lc_name}.rs"));
            let html_out_file = html_root.join(root_offset).join(format!("{name}.html"));
            let target_dir = html_root.join(root_offset);
            std::fs::create_dir_all(&target_dir).map_err(|e| {
                format!("Failed to create dir {target_dir:?} to place converted html {e}")
            })?;
            std::fs::write(&rust_out_file, rust_content.as_bytes())
                .map_err(|e| format!("Failed to write rust file to {rust_out_file:?} {e}"))?;
            std::fs::write(&html_out_file, html_content.as_bytes())
                .map_err(|e| format!("Failed to write converted html to {html_out_file:?} {e}"))?;
            files_here.push(lc_name);
        }
    }
    Ok(files_here)
}

fn format_page_mod(md_data: &str, name: &str) -> (String, String) {
    let parser = Parser::new(md_data);
    let cap = md_data.len() * 2;
    let mut html_output: String = String::with_capacity(cap);
    pulldown_cmark::html::push_html(&mut html_output, parser);
    let mut rust_content = format!(
        "const RAW_HTML: &str = include_str!(\"{}.html\");\n\n",
        name
    );
    rust_content.push_str(
        "pub fn page_html() -> yew::Html {\n\
    \tlet div = gloo_utils::document().create_element(\"div\").unwrap();\n\
    \tdiv.set_inner_html(RAW_HTML);\n\
    \tdiv.set_class_name(\"markdown-body\");\n\
    \tyew::Html::VRef(div.into())\n\
    }\n\n",
    );
    (rust_content, html_output)
}

fn dump_mod(mod_name: &str, dir: &Path, sub_modules: Vec<String>) -> Result<(), String> {
    let mod_rs = format!("{mod_name}.rs");
    let mod_file = dir.join(mod_rs);
    let mut mod_file_content = String::new();
    for module in sub_modules {
        let _ = mod_file_content.write_fmt(format_args!("pub mod {};\n", module));
    }
    std::fs::write(&mod_file, mod_file_content.as_bytes())
        .map_err(|e| format!("Failed to write module file {mod_file:?} {e}"))?;
    Ok(())
}
