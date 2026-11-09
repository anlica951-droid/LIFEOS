
/* =========================================================
   LIFEOS — GRADES & ACADEMIC PERFORMANCE
   File: js/grades.js
   Database: Supabase
   ========================================================= */

import { supabase } from "./supabase.js";

(() => {
    "use strict";

    // =====================================================
    // ELEMENTS
    // =====================================================

    const el = {
        subject: document.getElementById("gradesSubject"),

        total: document.getElementById("gradesTotal"),
        graded: document.getElementById("gradesGraded"),
        average: document.getElementById("gradesAverage"),

        categoriesList: document.getElementById("gradeCategoriesList"),
        categoriesEmpty: document.getElementById("gradeCategoriesEmpty"),

        recordsList: document.getElementById("gradesRecordsList"),
        recordsEmpty: document.getElementById("gradesRecordsEmpty"),

        feedback: document.getElementById("gradesFeedback"),

        addCategory: document.getElementById("addGradeCategoryBtn"),
        addScore: document.getElementById("addGradeScoreBtn"),

        categoryModal: document.getElementById("gradeCategoryModal"),
        categoryBackdrop: document.getElementById("gradeCategoryBackdrop"),
        categoryForm: document.getElementById("gradeCategoryForm"),
        categoryId: document.getElementById("gradeCategoryId"),
        categoryName: document.getElementById("gradeCategoryName"),
        categoryWeight: document.getElementById("gradeCategoryWeight"),
        categoryModalTitle: document.getElementById("gradeCategoryModalTitle"),
        categoryFeedback: document.getElementById("gradeCategoryFeedback"),

        scoreModal: document.getElementById("gradeScoreModal"),
        scoreBackdrop: document.getElementById("gradeScoreBackdrop"),
        scoreForm: document.getElementById("gradeScoreForm"),
        scoreItemId: document.getElementById("gradeScoreItemId"),
        scoreItem: document.getElementById("gradeScoreItem"),
        scoreCategory: document.getElementById("gradeScoreCategory"),
        scoreValue: document.getElementById("gradeScoreValue"),
        maxScore: document.getElementById("gradeMaxScore"),
        scoreFeedback: document.getElementById("gradeScoreFeedback")
    };

    // =====================================================
    // STATE
    // =====================================================

    let currentUser = null;
    let subjects = [];
    let categories = [];
    let academicItems = [];
    let saving = false;

    // =====================================================
    // HELPERS
    // =====================================================

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);
    }

    function refreshIcons() {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    function selectedSubjectId() {
        return el.subject?.value || "";
    }

    function showFeedback(message, type = "success") {
        if (!el.feedback) return;

        el.feedback.textContent = message;
        el.feedback.className = message ? type : "";
    }

    function showCategoryFeedback(message, type = "error") {
        if (!el.categoryFeedback) return;

        el.categoryFeedback.textContent = message;
        el.categoryFeedback.className = message ? type : "";
    }

    function showScoreFeedback(message, type = "error") {
        if (!el.scoreFeedback) return;

        el.scoreFeedback.textContent = message;
        el.scoreFeedback.className = message ? type : "";
    }

    function formatPercent(value) {
        return `${Number(value).toFixed(1)}%`;
    }

    function openModal(modal) {
        if (!modal) return;

        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");

        document.body.style.overflow = "hidden";

        refreshIcons();
    }

    function closeModal(modal) {
        if (!modal || saving) return;

        modal.classList.remove("active");
        modal.setAttribute("aria-hidden", "true");

        const anotherOpen = [
            el.categoryModal,
            el.scoreModal
        ].some(item => item?.classList.contains("active"));

        if (!anotherOpen) {
            document.body.style.overflow = "";
        }
    }

    function showEmptyState(message) {
        if (el.categoriesList) el.categoriesList.innerHTML = "";
        if (el.recordsList) el.recordsList.innerHTML = "";

        if (el.categoriesEmpty) {
            el.categoriesEmpty.hidden = false;
            el.categoriesEmpty.textContent = message;
        }

        if (el.recordsEmpty) {
            el.recordsEmpty.hidden = false;
        }
    }

    // =====================================================
    // LOAD SUBJECTS
    // =====================================================

    async function loadSubjects() {
        if (!el.subject) {
            throw new Error("The Grades subject selector is missing.");
        }

        el.subject.innerHTML = '<option value="">Loading subjects...</option>';

        const { data, error } = await supabase
            .from("subjects")
            .select("id, name")
            .eq("user_id", currentUser.id)
            .order("name", { ascending: true });

        if (error) throw error;

        subjects = data || [];

        if (!subjects.length) {
            el.subject.innerHTML = `
                <option value="">No subjects available</option>
            `;

            showFeedback(
                "Add a subject first before managing your grades.",
                "error"
            );

            categories = [];
            academicItems = [];

            renderAll();
            return;
        }

        el.subject.innerHTML = `
            <option value="">Select a subject</option>
            ${subjects.map(subject => `
                <option value="${escapeHTML(subject.id)}">
                    ${escapeHTML(subject.name)}
                </option>
            `).join("")}
        `;

        // Automatically select the first subject.
        el.subject.value = subjects[0].id;
    }

    // =====================================================
    // LOAD SUBJECT DATA
    // =====================================================

    async function loadData() {
        const subjectId = selectedSubjectId();

        if (!subjectId) {
            categories = [];
            academicItems = [];

            renderAll();
            return;
        }

        showFeedback("");

        if (el.categoriesEmpty) {
            el.categoriesEmpty.hidden = true;
        }

        if (el.recordsEmpty) {
            el.recordsEmpty.hidden = true;
        }

        const [categoryResult, itemResult] = await Promise.all([

            supabase
                .from("grade_categories")
                .select("*")
                .eq("user_id", currentUser.id)
                .eq("subject_id", subjectId)
                .order("name", { ascending: true }),

            supabase
                .from("academic_items")
                .select("*")
                .eq("user_id", currentUser.id)
                .eq("subject_id", subjectId)
                .order("title", { ascending: true })

        ]);

        if (categoryResult.error) throw categoryResult.error;
        if (itemResult.error) throw itemResult.error;

        categories = categoryResult.data || [];
        academicItems = itemResult.data || [];

        renderAll();
    }

    // =====================================================
    // STATISTICS
    // =====================================================

    function getGradedItems() {
        return academicItems.filter(item =>
            item.score !== null &&
            item.score !== undefined &&
            item.max_score !== null &&
            item.max_score !== undefined &&
            Number(item.max_score) > 0
        );
    }

    function renderStats() {
        const gradedItems = getGradedItems();

        const total = academicItems.length;
        const graded = gradedItems.length;

        let average = null;

        if (graded > 0) {
            const totalScore = gradedItems.reduce(
                (sum, item) => sum + Number(item.score),
                0
            );

            const totalMaximum = gradedItems.reduce(
                (sum, item) => sum + Number(item.max_score),
                0
            );

            if (totalMaximum > 0) {
                average = (totalScore / totalMaximum) * 100;
            }
        }

        if (el.total) el.total.textContent = total;
        if (el.graded) el.graded.textContent = graded;

        if (el.average) {
            el.average.textContent = average === null
                ? "—"
                : formatPercent(average);
        }
    }

    // =====================================================
    // CATEGORY SELECT OPTIONS
    // =====================================================

    function renderCategoryOptions(selectedId = "") {
        if (!el.scoreCategory) return;

        if (!categories.length) {
            el.scoreCategory.innerHTML = `
                <option value="">Add a category first</option>
            `;
            return;
        }

        el.scoreCategory.innerHTML = `
            <option value="">Select category</option>

            ${categories.map(category => `
                <option value="${escapeHTML(category.id)}"
                    ${category.id === selectedId ? "selected" : ""}>
                    ${escapeHTML(category.name)}
                </option>
            `).join("")}
        `;
    }

    // =====================================================
    // RENDER CATEGORIES
    // =====================================================

    function renderCategories() {
        if (!el.categoriesList || !el.categoriesEmpty) return;

        if (!categories.length) {
            el.categoriesList.innerHTML = "";
            el.categoriesEmpty.hidden = false;

            renderCategoryOptions();
            return;
        }

        el.categoriesEmpty.hidden = true;

        el.categoriesList.innerHTML = categories.map(category => `
            <div class="grade-category-card"
                 data-id="${escapeHTML(category.id)}">

                <div>
                    <h4>${escapeHTML(category.name)}</h4>
                    <span>
                        ${Number(category.weight).toFixed(1)}% weight
                    </span>
                </div>

                <div class="grade-category-actions">

                    <button type="button"
                            data-action="edit-category"
                            data-id="${escapeHTML(category.id)}">
                        <i data-lucide="pencil"></i>
                        Edit
                    </button>

                    <button type="button"
                            data-action="delete-category"
                            data-id="${escapeHTML(category.id)}">
                        <i data-lucide="trash-2"></i>
                        Delete
                    </button>

                </div>

            </div>
        `).join("");

        renderCategoryOptions();
        refreshIcons();
    }

    // =====================================================
    // OPEN CATEGORY FORM
    // =====================================================

    function openCategoryForm(category = null) {
        if (!selectedSubjectId()) {
            showFeedback("Select a subject first.", "error");
            return;
        }

        el.categoryForm.reset();

        showCategoryFeedback("");

        el.categoryId.value = category?.id || "";
        el.categoryName.value = category?.name || "";
        el.categoryWeight.value = category?.weight ?? "";

        el.categoryModalTitle.textContent = category
            ? "Edit Grade Category"
            : "Add Grade Category";

        openModal(el.categoryModal);
    }

    // =====================================================
    // SAVE CATEGORY
    // =====================================================

    async function saveCategory(event) {
        event.preventDefault();

        if (saving) return;

        const subjectId = selectedSubjectId();
        const name = el.categoryName.value.trim();
        const weight = Number(el.categoryWeight.value);
        const categoryId = el.categoryId.value;

        if (!subjectId) {
            showCategoryFeedback("Select a subject first.");
            return;
        }

        if (!name) {
            showCategoryFeedback("Enter a category name.");
            return;
        }

        if (
            !Number.isFinite(weight) ||
            weight < 0 ||
            weight > 100
        ) {
            showCategoryFeedback(
                "Weight must be between 0 and 100."
            );
            return;
        }

        const existingWeight = categories
            .filter(category => category.id !== categoryId)
            .reduce(
                (sum, category) => sum + Number(category.weight),
                0
            );

        if (existingWeight + weight > 100.0001) {
            showCategoryFeedback(
                "The total category weight cannot exceed 100%."
            );
            return;
        }

        const payload = {
            user_id: currentUser.id,
            subject_id: subjectId,
            name,
            weight
        };

        saving = true;

        try {
            let result;

            if (categoryId) {
                result = await supabase
                    .from("grade_categories")
                    .update(payload)
                    .eq("id", categoryId)
                    .eq("user_id", currentUser.id)
                    .eq("subject_id", subjectId);
            } else {
                result = await supabase
                    .from("grade_categories")
                    .insert(payload);
            }

            if (result.error) throw result.error;

            closeModal(el.categoryModal);

            showFeedback("Grade category saved successfully.");

            await loadData();

        } catch (error) {
            console.error("Save category error:", error);
            showCategoryFeedback(error.message || "Unable to save category.");
        } finally {
            saving = false;
        }
    }

    // =====================================================
    // DELETE CATEGORY
    // =====================================================

    async function deleteCategory(id) {
        if (saving) return;

        const category = categories.find(item => item.id === id);

        if (!category) return;

        const confirmed = window.confirm(
            `Delete the "${category.name}" category?`
        );

        if (!confirmed) return;

        saving = true;

        try {
            // Check whether academic work is using this category.
            const { count, error: checkError } = await supabase
                .from("academic_items")
                .select("id", {
                    count: "exact",
                    head: true
                })
                .eq("user_id", currentUser.id)
                .eq("subject_id", selectedSubjectId())
                .eq("category_id", id);

            if (checkError) throw checkError;

            if (count > 0) {
                showFeedback(
                    "This category is assigned to academic work. Reassign those items before deleting it.",
                    "error"
                );
                return;
            }

            const { error } = await supabase
                .from("grade_categories")
                .delete()
                .eq("id", id)
                .eq("user_id", currentUser.id)
                .eq("subject_id", selectedSubjectId());

            if (error) throw error;

            showFeedback("Grade category deleted successfully.");

            await loadData();

        } catch (error) {
            console.error("Delete category error:", error);
            showFeedback(error.message || "Unable to delete category.", "error");
        } finally {
            saving = false;
        }
    }

    // =====================================================
    // RENDER SCORE RECORDS
    // =====================================================

    function renderScoreRecords() {
        if (!el.recordsList || !el.recordsEmpty) return;

        const gradedItems = getGradedItems();

        el.recordsEmpty.hidden = gradedItems.length !== 0;

        if (!gradedItems.length) {
            el.recordsList.innerHTML = "";
            return;
        }

        el.recordsList.innerHTML = gradedItems.map(item => {
            const percentage =
                (Number(item.score) / Number(item.max_score)) * 100;

            const category = categories.find(
                record => record.id === item.category_id
            );

            return `
                <div class="grade-record-card"
                     data-id="${escapeHTML(item.id)}">

                    <div>
                        <h4>${escapeHTML(item.title)}</h4>

                        <span>
                            ${escapeHTML(category?.name || "Uncategorized")}
                        </span>
                    </div>

                    <div class="grade-record-result">
                        <strong>
                            ${Number(item.score)} /
                            ${Number(item.max_score)}
                        </strong>

                        <span>${formatPercent(percentage)}</span>
                    </div>

                    <button type="button"
                            data-action="edit-score"
                            data-id="${escapeHTML(item.id)}">
                        <i data-lucide="pencil"></i>
                        Edit Score
                    </button>

                </div>
            `;
        }).join("");

        refreshIcons();
    }

    // =====================================================
    // OPEN SCORE FORM
    // =====================================================

    function openScoreForm(item = null) {
        if (!selectedSubjectId()) {
            showFeedback("Select a subject first.", "error");
            return;
        }

        if (!academicItems.length) {
            showFeedback(
                "Add academic work before recording a score.",
                "error"
            );
            return;
        }

        if (!categories.length) {
            showFeedback(
                "Add a grade category before recording a score.",
                "error"
            );
            return;
        }

        el.scoreForm.reset();

        showScoreFeedback("");

        el.scoreItemId.value = item?.id || "";

        el.scoreItem.innerHTML = `
            <option value="">Select academic work</option>

            ${academicItems.map(record => `
                <option value="${escapeHTML(record.id)}"
                    ${record.id === item?.id ? "selected" : ""}>
                    ${escapeHTML(record.title)}
                </option>
            `).join("")}
        `;

        renderCategoryOptions(item?.category_id || "");

        el.scoreValue.value = item?.score ?? "";
        el.maxScore.value = item?.max_score ?? "";

        openModal(el.scoreModal);
    }

    // =====================================================
    // SAVE SCORE
    // =====================================================

    async function saveScore(event) {
        event.preventDefault();

        if (saving) return;

        const subjectId = selectedSubjectId();
        const itemId = el.scoreItem.value;
        const categoryId = el.scoreCategory.value;

        const score = Number(el.scoreValue.value);
        const maxScore = Number(el.maxScore.value);

        if (!subjectId) {
            showScoreFeedback("Select a subject first.");
            return;
        }

        if (!itemId || !categoryId) {
            showScoreFeedback(
                "Select both academic work and a grade category."
            );
            return;
        }

        if (
            !Number.isFinite(score) ||
            !Number.isFinite(maxScore) ||
            maxScore <= 0 ||
            score < 0 ||
            score > maxScore
        ) {
            showScoreFeedback(
                "Enter valid scores. Your score cannot exceed the maximum score."
            );
            return;
        }

        const selectedItem = academicItems.find(
            item => item.id === itemId
        );

        const selectedCategory = categories.find(
            category => category.id === categoryId
        );

        if (!selectedItem || !selectedCategory) {
            showScoreFeedback(
                "The selected academic work or category could not be found."
            );
            return;
        }

        saving = true;

        try {
            const { error } = await supabase
                .from("academic_items")
                .update({
                    category_id: categoryId,
                    score,
                    max_score: maxScore,
                    updated_at: new Date().toISOString()
                })
                .eq("id", itemId)
                .eq("user_id", currentUser.id)
                .eq("subject_id", subjectId);

            if (error) throw error;

            closeModal(el.scoreModal);

            showFeedback("Score recorded successfully.");

            await loadData();

        } catch (error) {
            console.error("Save score error:", error);
            showScoreFeedback(error.message || "Unable to save score.");
        } finally {
            saving = false;
        }
    }

    // =====================================================
    // RENDER ALL
    // =====================================================

    function renderAll() {
        renderStats();
        renderCategories();
        renderScoreRecords();
        renderCategoryOptions();
    }

    // =====================================================
    // EVENT LISTENERS
    // =====================================================

    function attachEvents() {

        // Subject selection
        el.subject?.addEventListener("change", async () => {
            try {
                await loadData();
            } catch (error) {
                console.error("Subject data error:", error);
                showFeedback(
                    error.message || "Unable to load this subject's grades.",
                    "error"
                );
            }
        });

        // Add category
        el.addCategory?.addEventListener("click", () => {
            openCategoryForm();
        });

        // Add score
        el.addScore?.addEventListener("click", () => {
            openScoreForm();
        });

        // Category modal buttons
        document.getElementById("closeGradeCategoryModal")
            ?.addEventListener("click", () => {
                closeModal(el.categoryModal);
            });

        document.getElementById("cancelGradeCategory")
            ?.addEventListener("click", () => {
                closeModal(el.categoryModal);
            });

        el.categoryBackdrop?.addEventListener("click", () => {
            closeModal(el.categoryModal);
        });

        // Score modal buttons
        document.getElementById("closeGradeScoreModal")
            ?.addEventListener("click", () => {
                closeModal(el.scoreModal);
            });

        document.getElementById("cancelGradeScore")
            ?.addEventListener("click", () => {
                closeModal(el.scoreModal);
            });

        el.scoreBackdrop?.addEventListener("click", () => {
            closeModal(el.scoreModal);
        });

        // Form submissions
        el.categoryForm?.addEventListener("submit", saveCategory);
        el.scoreForm?.addEventListener("submit", saveScore);

        // Category edit and delete
        el.categoriesList?.addEventListener("click", event => {
            const button = event.target.closest("button[data-action]");

            if (!button) return;

            const id = button.dataset.id;
            const action = button.dataset.action;

            const category = categories.find(
                item => item.id === id
            );

            if (action === "edit-category" && category) {
                openCategoryForm(category);
            }

            if (action === "delete-category") {
                deleteCategory(id);
            }
        });

        // Score editing
        el.recordsList?.addEventListener("click", event => {
            const button = event.target.closest("button[data-action]");

            if (!button) return;

            if (button.dataset.action === "edit-score") {
                const item = academicItems.find(
                    record => record.id === button.dataset.id
                );

                if (item) {
                    openScoreForm(item);
                }
            }
        });

        // Escape key closes modals
        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                closeModal(el.categoryModal);
                closeModal(el.scoreModal);
            }
        });
    }

    // =====================================================
    // INITIALIZATION
    // =====================================================

    async function init() {
        try {
            // Check whether the required Grades HTML exists.
            if (!el.subject || !el.categoriesList || !el.recordsList) {
                console.error(
                    "Grades HTML elements are missing. Check subjects.html."
                );
                return;
            }

            const { data, error } = await supabase.auth.getSession();

            if (error) throw error;

            currentUser = data.session?.user;

            if (!currentUser) {
                window.location.href = "../login.html";
                return;
            }

            attachEvents();

            await loadSubjects();

            if (subjects.length > 0) {
                await loadData();
            }

            refreshIcons();

        } catch (error) {
            console.error("Grades initialization error:", error);

            showFeedback(
                error.message || "Unable to load Grades & Performance.",
                "error"
            );
        }
    }

    init();

})();
