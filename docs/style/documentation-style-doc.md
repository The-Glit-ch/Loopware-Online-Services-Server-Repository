# **Loopware Online Subsystem Server: Style Guides**
## ***Documentation Style Guide***

---

### Description:
A simple guide on how documentation should be written for Loss. Each documentation "type" has it's own format so make sure you choose the appropriate one. You are able to ignore some parts of the format (eg: using the documentation template but not adding diagrams) however you cannot change the order nor replace it with another format type. (eg: replacing "Diagrams" in the documentation template with "Templates")

---

### Templates:
#### Generalized Documentation Template
Applies to informative/generalized documentation

```markdown
# **Loopware Online Subsystem Server: [Main Topic]**
## ***[Sub Topic]***

---

### Description:

---

### Documents:
#### Document 1

---

#### Document 2

---

### Diagrams:
#### Diagram 1

---

#### Diagram 2

---

### Summary

---
```

---

#### Template Documentation Template
Applies to documentation that provides templates for other use cases. (ex: code styles, example code)

```markdown
# **Loopware Online Subsystem Server: [Main Topic]**
## ***[Sub Topic]***

---

### Description:

---

### Templates:
#### Template 1

---

#### Template 2

----
```

---

#### Services Documentation Template
Applies to documentation relating to Loss services. (ex: HyperNet, Cosmic Storage, Space Guard)

```markdown
# **Loopware Online Subsystem Server: [Main Topic]**
## ***[Sub Topic]***

---

### Description:

---

### Examples:
#### Example 1

---

#### Example 2

---

### Diagrams
#### Diagram 1

---

#### Diagram 2

---

### Additional Notes:

---
```

---

#### Code Documentation Template
Applies to code worth being documented (ex: modules, interfaces, classes). Note the "Properties and Definitions" portion must follow the order stated in [the code styles documentation.](code-style-doc.md)

```markdown
# **Loopware Online Subsystem Server: [Main Topic]**
## ***[Sub Topic]***

---

### Description:

---

### Examples:
#### Example 1

---

#### Example 2

---

### Properties and Definitions:

---

### Additional Notes:

---
```
---