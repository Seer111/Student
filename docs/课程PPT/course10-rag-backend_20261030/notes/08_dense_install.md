第 8 页 · 装依赖，建服务文件

动手第一步，在 backend 目录下装四个包。
装的时候如果 hnswlib-node 编译失败，别慌——它是个带 C++ 扩展的包，先装 Python 和构建工具再重装。
装完新建 services/vectorStoreService.js，把所有向量相关逻辑集中在这一个文件里，路由只负责调用。
注意那个常量 VECTOR_STORE_PATH：它决定数据落在 vector_store/ 目录，运行后自动生成，可以整个复制带走。
组织上的原则是：向量库的细节不要泄漏到路由里。
