/**
 * 腾讯问卷后台：投放问卷 → 问卷嵌入 → 嵌入网页。
 * 目前先使用公开分享链接，等待浏览器嵌入验证。
 * 若平台对普通分享链接限制 iframe，请改用官方生成的 HTML 嵌入代码中的 src。
 *
 * 留空时官网显示“问卷尚未开放”，不会加载假表单。
 * 这里是公开的问卷访问地址，不需要填写 API Key / Secret。
 */
export const tencentQuestionnaireEmbedSrc = 'https://wj.qq.com/s2/28745883/6dyd/'
