# Criteria System

Note selection and extensibility (PRD F1.3, src/criteria).

```mermaid
flowchart TB
    subgraph resolver [NoteResolver]
        NoteResolver[NoteResolver]
    end

    subgraph include [Include Criteria - one primary mode]
        FolderCriterion[FolderCriterion]
        TagCriterion[TagCriterion]
    end

    subgraph exclude [Exclusion Criteria - combined]
        ExcludeByName[ExcludeByNameCriterion]
        ExcludeByTag[ExcludeByTagCriterion]
        ExcludeByProperty[ExcludeByPropertyCriterion]
        CombinedExclusion[CombinedExclusionCriterion]
        ExcludeByName --> CombinedExclusion
        ExcludeByTag --> CombinedExclusion
        ExcludeByProperty --> CombinedExclusion
    end

    subgraph flow [Evaluation order]
        File[TFile + metadata]
        CheckExclusion{Exclusion.evaluate?}
        CheckInclude{Include by settings/criteria?}
        Match[Match]
        NoMatch[No match]
        File --> CheckExclusion
        CheckExclusion -->|Yes| NoMatch
        CheckExclusion -->|No| CheckInclude
        CheckInclude -->|Folder| FolderCriterion
        CheckInclude -->|Tag| TagCriterion
        FolderCriterion --> Match
        TagCriterion --> Match
    end

    NoteResolver --> CombinedExclusion
    NoteResolver --> FolderCriterion
    NoteResolver --> TagCriterion
```

Future: SelectionCriterion interface — `id`, type include/exclude, `evaluate(file, metadata)` — for regex, link count, etc.
