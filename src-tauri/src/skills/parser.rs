use std::collections::HashMap;

pub struct ParsedSkill {
    pub frontmatter: HashMap<String, String>,
    pub body: String,
}

pub fn parse_skill_md(content: &str) -> ParsedSkill {
    let mut frontmatter = HashMap::new();
    let body;

    if content.starts_with("---") {
        // Find closing ---
        if let Some(end_idx) = content[3..].find("\n---") {
            let yaml_block = &content[3..3 + end_idx].trim();
            body = content[3 + end_idx + 4..].trim_start().to_string();

            for line in yaml_block.lines() {
                if let Some((key, value)) = line.split_once(':') {
                    let key = key.trim().to_string();
                    let value = value.trim().to_string();
                    if !key.is_empty() {
                        frontmatter.insert(key, value);
                    }
                }
            }
        } else {
            body = content.to_string();
        }
    } else {
        body = content.to_string();
    }

    ParsedSkill { frontmatter, body }
}
