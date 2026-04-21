from langgraph.graph import END, START, StateGraph

from graph.state import ChatbotState
from graph.node.policy_node import policy_node
from graph.node.date_node import date_node
from graph.node.extract_node import extract_node
from graph.node.routing_node import routing_node
from graph.node.pdf_node import pdf_node
from graph.node.db_node import db_node
from graph.node.answer_node import answer_node

def route_after_policy(state: ChatbotState) -> str:
    allowed_status=state.get("allowed_status")
    
    if allowed_status == "ALLOWED":
        return "date_node"
    
    return "answer_node"

def route_after_date(state: ChatbotState) -> str:
    allowed_status=state.get("allowed_status")
    final_answer=state.get("final_answer")
    
    if allowed_status == "NEEDS_CLARIFICATION":
        return "answer_node"
    
    if final_answer:
        return "answer_node"
    
    return "extract_node"

def route_after_routing(state: ChatbotState) -> str:
    source_type=state.get("source_type")
    
    if source_type == "PDF":
        return "pdf_node"
    
    if source_type == "DB":
        return "db_node"
    
    if source_type == "BOTH":
        return "pdf_node"
    
    return "answer_node"

def route_after_pdf(state: ChatbotState) -> str:
    source_type=state.get("source_type")
    
    if source_type == "BOTH":
        return "db_node"
    
    return "answer_node"

def build_graph():
    builder=StateGraph(ChatbotState)
    
    builder.add_node("policy_node", policy_node)
    builder.add_node("date_node", date_node)
    builder.add_node("extract_node", extract_node)
    builder.add_node("routing_node", routing_node)
    builder.add_node("pdf_node", pdf_node)
    builder.add_node("db_node", db_node)
    builder.add_node("answer_node", answer_node)

    builder.add_edge(START, "policy_node")
    
    builder.add_conditional_edges(
        "policy_node",
        route_after_policy,
        {
            "date_node": "date_node",
            "answer_node": "answer_node"
        }
    )
    
    builder.add_conditional_edges(
        "date_node",
        route_after_date,
        {
            "extract_node": "extract_node",
            "answer_node": "answer_node"
        }
    )
    
    builder.add_edge("extract_node", "routing_node")
    
    builder.add_conditional_edges(
        "routing_node",
        route_after_routing,
        {
            "pdf_node": "pdf_node",
            "db_node": "db_node",
            "answer_node": "answer_node"
        }
    )
    
    builder.add_conditional_edges(
        "pdf_node",
        route_after_pdf,
        {
            "db_node": "db_node",
            "answer_node": "answer_node"
        }
    )
    
    builder.add_edge("db_node", "answer_node")
    builder.add_edge("answer_node", END)
    
    return builder.compile()

graph=build_graph()